import type { IAppItem } from 'google-play-scraper';
import { DETAIL_CONCURRENCY, RECENT_YEARS, YEAR_MS } from '../config.js';
import { mapLimit } from '../lib/async.js';
import type {
    AppDetails,
    AppResult,
    Candidate,
    ExclusionStats,
    Filters,
    SearchMode,
    SearchResponse,
    SeedInfo,
} from '../types.js';
import { tryFetchDetails } from './playStore.js';

/**
 * Pipeline compartilhado pelos dois modos de busca:
 * varredura (candidatos) → deep fetch → filtros → ordenação → resposta.
 */

export type CandidateMap = Map<string, Candidate>;

// Categorias "GAME" e "GAME_*" (ACTION, SIMULATION, PUZZLE...). O ID independe do idioma.
const isGameCategory = (genreId: string): boolean => genreId.toUpperCase().startsWith('GAME');

/** Registra um app encontrado; se já existir, acumula a origem e mantém a melhor posição. */
export function addCandidate(map: CandidateMap, item: IAppItem, source: string, rank: number): void {
    const existing = map.get(item.appId);
    if (existing) {
        if (!existing.sources.includes(source)) existing.sources.push(source);
        existing.bestRank = Math.min(existing.bestRank, rank);
        return;
    }
    map.set(item.appId, {
        appId: item.appId,
        title: item.title,
        developer: item.developer,
        icon: item.icon,
        summary: item.summary ?? '',
        url: item.url,
        sources: [source],
        bestRank: rank,
    });
}

/** Motivo de exclusão do app (o 1º que se aplicar), ou `null` se ele passa em todos os filtros. */
function exclusionReason(d: AppDetails, f: Filters, cutoff: number): keyof ExclusionStats | null {
    // Ordem: filtros mais "baratos" e mais restritivos primeiro (conta só o 1º motivo).
    if (f.excludeGames && isGameCategory(d.genreId)) return 'games';
    if (f.price === 'free' && !d.free) return 'price';
    if (f.price === 'paid' && d.free) return 'price';
    if (d.score < f.minScore) return 'score';
    if (d.minInstalls < f.minInstalls) return 'installs';
    if (f.recentOnly && (!d.updated || d.updated < cutoff)) return 'outdated';
    return null;
}

function toResult(c: Candidate, d: AppDetails, mode: SearchMode): AppResult {
    const updated = new Date(d.updated);
    return {
        appId: d.appId,
        title: d.title || c.title,
        developer: d.developer || c.developer,
        icon: d.icon || c.icon,
        summary: d.summary || c.summary,
        url: d.url || c.url,
        score: d.score,
        ratings: d.ratings,
        installs: d.installs,
        minInstalls: d.minInstalls,
        updatedAt: Number.isNaN(updated.getTime()) ? '' : updated.toISOString(),
        updatedYear: updated.getFullYear(),
        genre: d.genre,
        genreId: d.genreId,
        free: d.free,
        price: d.price,
        priceText: d.priceText,
        sources: [...c.sources],
        // "duplicata" só faz sentido entre termos de busca diferentes
        isDuplicate: mode === 'keyword' && c.sources.length > 1,
    };
}

export async function enrichAndFilter(
    candidates: Candidate[],
    f: Filters,
    mode: SearchMode,
    isRelevant: (c: Candidate, d: AppDetails) => boolean = () => true
): Promise<{ data: AppResult[]; excluded: ExclusionStats }> {
    const excluded: ExclusionStats = { score: 0, installs: 0, outdated: 0, games: 0, price: 0, offTopic: 0, failed: 0 };
    const cutoff = Date.now() - RECENT_YEARS * YEAR_MS;

    const details = await mapLimit(candidates, DETAIL_CONCURRENCY, (c) => tryFetchDetails(c.appId, f));

    const kept: { result: AppResult; rank: number }[] = [];
    candidates.forEach((c, i) => {
        const d = details[i];
        if (!d) return void excluded.failed++;
        if (!isRelevant(c, d)) return void excluded.offTopic++;

        const reason = exclusionReason(d, f, cutoff);
        if (reason) return void excluded[reason]++;

        kept.push({ rank: c.bestRank, result: toResult(c, d, mode) });
    });

    kept.sort((a, b) => {
        // Quem aparece em mais listas (termos ou concorrentes) vem primeiro.
        const byMatches = b.result.sources.length - a.result.sources.length;
        if (byMatches) return byMatches;
        // Concorrentes: os maiores (em downloads) primeiro. Palavra-chave: ordem de relevância do Google.
        return mode === 'similar' ? b.result.minInstalls - a.result.minInstalls : a.rank - b.rank;
    });

    return { data: kept.map((k) => k.result), excluded };
}

export function buildResponse(
    mode: SearchMode,
    scanned: number,
    data: AppResult[],
    excluded: ExclusionStats,
    seed?: SeedInfo
): SearchResponse {
    return {
        mode,
        total: data.length,
        scanned,
        duplicatedCount: data.filter((a) => a.isDuplicate).length,
        excluded,
        ...(seed ? { seed } : {}),
        data,
    };
}

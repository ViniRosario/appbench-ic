import type { IAppItem } from 'google-play-scraper';
import { FINAL_RETRY_DELAY_MS, STORE_RESULTS_LIMIT } from '../config.js';
import { sleep } from '../lib/async.js';
import { errorMessage, isNotFound } from '../lib/errors.js';
import type {
    AppDetails,
    AppResult,
    Candidate,
    FailedApp,
    JobProgress,
    Locale,
    SearchMode,
    SearchResponse,
    SeedInfo,
    TermMatch,
} from '../types.js';
import { fetchDetails, storeStats } from './playStore.js';
import { createTermMatcher } from './relevance.js';

/**
 * Pipeline de coleta compartilhado pelos dois modos:
 * listas da loja → candidatos únicos → leitura da página de cada app (com releitura das falhas)
 * → resposta com funil conferido. Os critérios (filtros) são aplicados no cliente.
 */

/** Lista da loja já estabilizada (união de consultas repetidas — ver services/searches.ts). */
export interface StoreList {
    query: string;
    entries: { item: IAppItem; position: number }[]; // position = melhor posição observada
    passes: number;
    intermittent: number;
    reachedLimit: boolean;
}

export interface PipelineInput {
    mode: SearchMode;
    lists: StoreList[];
    locale: Locale;
    terms: string[];
    seed?: SeedInfo;
    notices?: string[];
    report: (progress: JobProgress) => void;
}

type Outcome = { details: AppDetails } | { error: unknown };

const bestPosition = (sources: { position: number }[]): number => Math.min(...sources.map((s) => s.position));

/** Junta as listas da loja em candidatos únicos, guardando em que lista/posição cada um apareceu. */
function collectCandidates(lists: StoreList[]): { candidates: Candidate[]; identified: number } {
    const byId = new Map<string, Candidate>();
    let identified = 0;

    for (const { query, entries } of lists) {
        for (const { item, position } of entries) {
            identified++;
            const existing = byId.get(item.appId);
            if (existing) {
                existing.sources.push({ query, position });
                continue;
            }
            byId.set(item.appId, {
                appId: item.appId,
                title: item.title,
                developer: item.developer,
                icon: item.icon,
                summary: item.summary ?? '',
                url: item.url,
                sources: [{ query, position }],
            });
        }
    }
    return { candidates: [...byId.values()], identified };
}

async function readDetails(candidates: Candidate[], locale: Locale, report: PipelineInput['report']): Promise<Outcome[]> {
    const total = candidates.length;
    let done = 0;
    const message = 'Lendo a página de cada app na Play Store';
    report({ phase: 'details', done, total, message });

    return Promise.all(
        candidates.map(async (c): Promise<Outcome> => {
            try {
                return { details: await fetchDetails(c.appId, locale) };
            } catch (error) {
                return { error };
            } finally {
                report({ phase: 'details', done: ++done, total, message });
            }
        })
    );
}

/** Última rodada, sequencial e espaçada, para apps que falharam (404 é definitivo e não é repetido). */
async function retryFailures(candidates: Candidate[], outcomes: Outcome[], locale: Locale, report: PipelineInput['report']): Promise<void> {
    const pending = outcomes.flatMap((o, i) => ('error' in o && !isNotFound(o.error) ? [i] : []));
    for (const [n, i] of pending.entries()) {
        report({ phase: 'retry', done: n, total: pending.length, message: 'Relendo apps que falharam' });
        await sleep(FINAL_RETRY_DELAY_MS);
        const c = candidates[i];
        if (!c) continue;
        try {
            outcomes[i] = { details: await fetchDetails(c.appId, locale) };
        } catch (error) {
            outcomes[i] = { error };
        }
    }
}

function toResult(c: Candidate, d: AppDetails, termMatches: TermMatch[]): AppResult {
    return {
        appId: d.appId,
        title: d.title || c.title,
        developer: d.developer || c.developer,
        icon: d.icon || c.icon,
        summary: d.summary || c.summary,
        url: d.url || c.url,
        scoreText: d.scoreText,
        score: d.score,
        ratings: d.ratings,
        installs: d.installs,
        minInstalls: d.minInstalls,
        updatedAt: d.updated ? new Date(d.updated).toISOString() : '',
        releasedAt: d.released,
        genre: d.genre,
        genreId: d.genreId,
        free: d.free,
        price: d.price,
        priceText: d.priceText,
        adSupported: d.adSupported,
        offersIAP: d.offersIAP,
        iapRange: d.iapRange,
        contentRating: d.contentRating,
        sources: c.sources,
        termMatches,
        fetchedAt: d.fetchedAt,
    };
}

function failureDetail(error: unknown, country: string): string {
    return isNotFound(error)
        ? `A página do app não está disponível na Play Store (${country.toUpperCase()}).`
        : `Não foi possível ler a página do app após várias tentativas (${errorMessage(error)}).`;
}

function buildNotices(lists: StoreList[], failed: number, base: string[]): string[] {
    const notices = [...base];
    for (const l of lists.filter((x) => x.intermittent > 0)) {
        notices.push(
            `"${l.query}": a Play Store variou a lista entre consultas idênticas. Foram feitas ${l.passes} consultas e a coleta ` +
                `usa a união: ${l.entries.length} apps distintos, dos quais ${l.intermittent} ` +
                `${l.intermittent === 1 ? 'apareceu' : 'apareceram'} só em parte das consultas.`
        );
    }
    const capped = lists.filter((l) => l.reachedLimit).map((l) => `"${l.query}"`);
    if (capped.length > 0) {
        notices.push(
            `${capped.join(', ')} ${capped.length > 1 ? 'atingiram' : 'atingiu'} o limite de ${STORE_RESULTS_LIMIT} resultados que a Play Store exibe por busca. ` +
                'A loja pode ter outros apps sobre o tema; para ampliar a cobertura, pesquise também termos mais específicos.'
        );
    }
    if (failed > 0) {
        notices.push(
            `${failed} ${failed === 1 ? 'app não pôde ser lido na loja e aparece' : 'apps não puderam ser lidos na loja e aparecem'} ` +
                'como excluídos por "falha de leitura" (veja a exportação de auditoria). A amostra pode estar incompleta; ' +
                'repita a busca para tentar de novo.'
        );
    }
    return notices;
}

export async function runPipeline(input: PipelineInput): Promise<SearchResponse> {
    const { mode, lists, locale, terms, seed, report } = input;
    const { candidates, identified } = collectCandidates(lists);

    const startedAt = Date.now();
    const before = { ...storeStats };
    const outcomes = await readDetails(candidates, locale, report);
    await retryFailures(candidates, outcomes, locale, report);
    const requests = storeStats.requests - before.requests;
    console.log(
        `📊 ${candidates.length} apps lidos em ${((Date.now() - startedAt) / 1000).toFixed(1)}s | ` +
            `requisições ${requests} | novas tentativas ${storeStats.retries - before.retries} | ` +
            `falhas ${storeStats.failures - before.failures} | latência média ` +
            `${requests ? Math.round((storeStats.totalMs - before.totalMs) / requests) : 0}ms`
    );

    const matchTerms = createTermMatcher(mode === 'keyword' ? terms : []);
    const apps: AppResult[] = [];
    const failedApps: FailedApp[] = [];

    candidates.forEach((c, i) => {
        const outcome = outcomes[i];
        if (outcome && 'details' in outcome) {
            apps.push(toResult(c, outcome.details, matchTerms(outcome.details)));
        } else {
            failedApps.push({
                appId: c.appId,
                title: c.title,
                url: c.url,
                sources: c.sources,
                detail: failureDetail(outcome?.error, locale.country),
            });
        }
    });

    // Invariante: todo app único termina lido ou registrado como falha — nenhum some no caminho.
    if (apps.length + failedApps.length !== candidates.length) {
        throw new Error(`Contagem inconsistente: ${candidates.length} únicos ≠ ${apps.length} lidos + ${failedApps.length} falhas`);
    }

    // Ordem de relevância da loja: palavra-chave = mais termos e melhor posição; concorrente = posição na lista.
    apps.sort((a, b) =>
        mode === 'keyword'
            ? b.sources.length - a.sources.length ||
              bestPosition(a.sources) - bestPosition(b.sources) ||
              a.title.localeCompare(b.title, 'pt-BR')
            : bestPosition(a.sources) - bestPosition(b.sources)
    );

    return {
        mode,
        collection: { ...locale, terms, app: seed?.appId ?? '', storeLimit: STORE_RESULTS_LIMIT },
        collectedAt: new Date().toISOString(),
        queries: lists.map((l) => ({
            query: l.query,
            found: l.entries.length,
            reachedStoreLimit: l.reachedLimit,
            passes: l.passes,
            intermittent: l.intermittent,
        })),
        funnel: {
            identified,
            duplicates: identified - candidates.length,
            unique: candidates.length,
            read: apps.length,
            failed: failedApps.length,
        },
        ...(seed ? { seed } : {}),
        notices: buildNotices(lists, failedApps.length, input.notices ?? []),
        apps,
        failedApps,
    };
}

import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import gplay from 'google-play-scraper';
import type { IAppItem } from 'google-play-scraper';

const app = express();
const PORT = Number(process.env.PORT) || 3333;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type PriceFilter = 'all' | 'free' | 'paid';
type SearchMode = 'keyword' | 'similar';

interface Filters {
    minScore: number; // 0 = sem filtro
    minInstalls: number; // 0 = sem filtro
    recentOnly: boolean; // exclui apps sem atualização há mais de RECENT_YEARS
    price: PriceFilter;
    excludeGames: boolean;
    lang: string;
    country: string;
}

/** App encontrado na fase de varredura (dados rasos, antes do deep fetch). */
interface Candidate {
    appId: string;
    title: string;
    developer: string;
    icon: string;
    summary: string;
    url: string;
    sources: string[]; // termos (modo keyword) ou apps de origem (modo similar)
    bestRank: number;
}

/** Metadados reais extraídos da página do app. */
interface AppDetails {
    appId: string;
    title: string;
    developer: string;
    icon: string;
    summary: string;
    url: string;
    score: number;
    ratings: number;
    installs: string;
    minInstalls: number;
    updated: number;
    released: string;
    genre: string;
    genreId: string;
    free: boolean;
    price: number;
    priceText: string;
}

interface AppResult {
    appId: string;
    title: string;
    developer: string;
    icon: string;
    summary: string;
    url: string;
    score: number;
    ratings: number;
    installs: string;
    minInstalls: number;
    updatedAt: string; // ISO
    updatedYear: number;
    genre: string;
    genreId: string;
    free: boolean;
    price: number;
    priceText: string;
    keywordOrigin: string;
    matchedTerms: number;
    isDuplicate: boolean;
}

interface ExclusionStats {
    score: number;
    installs: number;
    outdated: number;
    games: number;
    price: number;
    offTopic: number; // modo similar: concorrentes indiretos de outra categoria
    failed: number;
}

interface SeedInfo {
    appId: string;
    title: string;
    developer: string;
    icon: string;
    genre: string;
    url: string;
}

// ---------------------------------------------------------------------------
// Configuração e utilitários
// ---------------------------------------------------------------------------

const MAX_TERMS = 10;
const MAX_LIMIT = 100; // resultados por termo
const DETAIL_CONCURRENCY = 4; // requisições simultâneas ao Google
const SIMILAR_EXPANSION = 3; // quantos concorrentes diretos também são expandidos
const RECENT_YEARS = 2;
const DETAILS_TTL_MS = 6 * 60 * 60 * 1000;
const LIST_TTL_MS = 60 * 60 * 1000;
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

// Categorias "GAME" e "GAME_*" (ACTION, SIMULATION, PUZZLE...). O ID independe do idioma.
const isGameCategory = (genreId: string): boolean => genreId.toUpperCase().startsWith('GAME');

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

const ALLOWED_INSTALLS = [0, 10_000, 100_000, 1_000_000, 10_000_000];

function parseFilters(b: Record<string, unknown>): Filters {
    const installs = Number(b.minInstalls) || 0;
    return {
        minScore: clamp(Number(b.minScore) || 0, 0, 5),
        minInstalls: ALLOWED_INSTALLS.includes(installs) ? installs : 0,
        recentOnly: b.recentOnly === true,
        price: b.price === 'free' || b.price === 'paid' ? b.price : 'all',
        // padrão: jogos excluídos (só inclui se o cliente enviar false explicitamente)
        excludeGames: b.excludeGames !== false,
        lang: typeof b.lang === 'string' && /^[a-z]{2}$/i.test(b.lang) ? b.lang.toLowerCase() : 'pt',
        country: typeof b.country === 'string' && /^[a-z]{2}$/i.test(b.country) ? b.country.toLowerCase() : 'br',
    };
}

const asRecord = (body: unknown): Record<string, unknown> =>
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

/** Aceita um ID ("com.empresa.app") ou uma URL da Play Store com ?id=... */
function extractAppId(input: string): string | null {
    const value = input.trim();
    const fromUrl = /[?&]id=([A-Za-z0-9_.]+)/.exec(value);
    const candidate = fromUrl?.[1] ?? value;
    return /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/.test(candidate) ? candidate : null;
}

/** Executa `fn` sobre os itens com no máximo `concurrency` execuções simultâneas. */
async function mapLimit<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i] as T);
        }
    });
    await Promise.all(workers);
    return results;
}

// Cache em memória: reduz requisições repetidas ao Google (e o risco de bloqueio).
const cache = new Map<string, { expires: number; value: unknown }>();

async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as T;
    const value = await fn();
    cache.set(key, { expires: Date.now() + ttl, value });
    return value;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError;
}

async function fetchDetails(appId: string, lang: string, country: string): Promise<AppDetails> {
    return cached(`app|${appId}|${lang}|${country}`, DETAILS_TTL_MS, async () => {
        const full = await withRetry(() => gplay.app({ appId, lang, country }));
        return {
            appId: full.appId,
            title: full.title,
            developer: full.developer,
            icon: full.icon,
            summary: full.summary ?? '',
            url: full.url,
            score: Number(full.score) || 0,
            ratings: full.ratings ?? 0,
            installs: full.installs ?? 'N/D',
            minInstalls: full.minInstalls ?? 0,
            updated: full.updated,
            released: full.released ?? '',
            genre: full.genre ?? '',
            genreId: full.genreId ?? '',
            free: full.free,
            price: full.price ?? 0,
            priceText: full.priceText ?? '',
        };
    });
}

const tryFetchDetails = (appId: string, f: Filters): Promise<AppDetails | null> =>
    fetchDetails(appId, f.lang, f.country).catch(() => null);

function addCandidate(map: Map<string, Candidate>, item: IAppItem, source: string, rank: number): void {
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

// ---------------------------------------------------------------------------
// Pipeline compartilhado: deep fetch + filtros + ordenação
// ---------------------------------------------------------------------------

async function enrichAndFilter(
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

        // Ordem: filtros mais "baratos" e mais restritivos primeiro (conta só o 1º motivo).
        if (f.excludeGames && isGameCategory(d.genreId)) return void excluded.games++;
        if (f.price === 'free' && !d.free) return void excluded.price++;
        if (f.price === 'paid' && d.free) return void excluded.price++;
        if (d.score < f.minScore) return void excluded.score++;
        if (d.minInstalls < f.minInstalls) return void excluded.installs++;
        if (f.recentOnly && (!d.updated || d.updated < cutoff)) return void excluded.outdated++;

        const updated = new Date(d.updated);
        kept.push({
            rank: c.bestRank,
            result: {
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
                keywordOrigin: c.sources.join(', '),
                matchedTerms: c.sources.length,
                // "duplicata" só faz sentido entre termos de busca diferentes
                isDuplicate: mode === 'keyword' && c.sources.length > 1,
            },
        });
    });

    kept.sort((a, b) => {
        const byMatches = b.result.matchedTerms - a.result.matchedTerms;
        if (byMatches) return byMatches;
        // Concorrentes: os maiores (em downloads) primeiro. Palavra-chave: ordem de relevância do Google.
        return mode === 'similar' ? b.result.minInstalls - a.result.minInstalls : a.rank - b.rank;
    });

    return { data: kept.map((k) => k.result), excluded };
}

function respond(
    res: Response,
    mode: SearchMode,
    scanned: number,
    data: AppResult[],
    excluded: ExclusionStats,
    seed?: SeedInfo
): void {
    res.status(200).json({
        mode,
        total: data.length,
        scanned,
        duplicatedCount: data.filter((a) => a.isDuplicate).length,
        excludedGames: excluded.games,
        failedDetails: excluded.failed,
        excluded,
        ...(seed ? { seed } : {}),
        data,
    });
}

// ---------------------------------------------------------------------------
// Modo 1: palavra-chave
// ---------------------------------------------------------------------------

app.post('/api/search', async (req: Request, res: Response): Promise<void> => {
    const body = asRecord(req.body);
    const f = parseFilters(body);

    const terms = Array.isArray(body.terms)
        ? [...new Set(body.terms.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean))].slice(0, MAX_TERMS)
        : [];
    if (terms.length === 0) {
        res.status(400).json({ error: "É necessário enviar um array de 'terms' com ao menos um termo." });
        return;
    }
    const limit = clamp(Number(body.limit) || 50, 1, MAX_LIMIT);

    console.log(`\n🔎 [keyword] ${terms.join(', ')} | filtros: ${JSON.stringify(f)}`);

    try {
        const candidates = new Map<string, Candidate>();
        // Termos em sequência (não em paralelo) para não disparar rajadas contra o Google.
        for (const term of terms) {
            const results = await cached(`search|${term}|${limit}|${f.price}|${f.lang}|${f.country}`, LIST_TTL_MS, () =>
                withRetry(() => gplay.search({ term, num: limit, lang: f.lang, country: f.country, price: f.price }))
            );
            results.forEach((item, rank) => addCandidate(candidates, item, term, rank));
        }

        const { data, excluded } = await enrichAndFilter([...candidates.values()], f, 'keyword');
        console.log(`✅ [keyword] ${candidates.size} varridos → ${data.length} aprovados`, excluded);
        respond(res, 'keyword', candidates.size, data, excluded);
    } catch (error) {
        console.error('Erro na busca por palavra-chave:', error);
        res.status(502).json({ error: 'Falha ao extrair dados da loja. Tente novamente em instantes.' });
    }
});

// ---------------------------------------------------------------------------
// Modo 2: concorrentes / apps semelhantes
// ---------------------------------------------------------------------------

app.post('/api/similar', async (req: Request, res: Response): Promise<void> => {
    const body = asRecord(req.body);
    const f = parseFilters(body);
    const appId = typeof body.app === 'string' ? extractAppId(body.app) : null;

    if (!appId) {
        res.status(400).json({ error: "Envie em 'app' a URL da Play Store ou o ID do aplicativo (ex: com.nubank.app)." });
        return;
    }

    console.log(`\n🔎 [similar] ${appId} | filtros: ${JSON.stringify(f)}`);

    let seedDetails: AppDetails;
    try {
        seedDetails = await fetchDetails(appId, f.lang, f.country);
    } catch {
        res.status(404).json({ error: `Aplicativo '${appId}' não encontrado na Play Store (${f.country.toUpperCase()}).` });
        return;
    }

    const seed: SeedInfo = {
        appId: seedDetails.appId,
        title: seedDetails.title,
        developer: seedDetails.developer,
        icon: seedDetails.icon,
        genre: seedDetails.genre,
        url: seedDetails.url,
    };

    const similarOf = (id: string) =>
        cached(`similar|${id}|${f.lang}|${f.country}`, LIST_TTL_MS, () =>
            withRetry(() => gplay.similar({ appId: id, lang: f.lang, country: f.country }))
        );

    try {
        const candidates = new Map<string, Candidate>();

        // Nível 1: concorrentes diretos do app informado.
        const direct = await similarOf(appId);
        direct.forEach((item, rank) => addCandidate(candidates, item, seed.title, rank));

        // Nível 2: expande pelos principais concorrentes diretos para ampliar a amostra.
        // Apps que aparecem em várias listas sobem no ranking (matchedTerms).
        const toExpand = direct.slice(0, SIMILAR_EXPANSION);
        const expanded = await mapLimit(toExpand, DETAIL_CONCURRENCY, (item) => similarOf(item.appId).catch(() => []));
        expanded.forEach((list, i) => {
            const origin = toExpand[i]?.title ?? '';
            list.forEach((item, rank) => addCandidate(candidates, item, origin, direct.length + rank));
        });

        candidates.delete(appId); // o próprio app não é concorrente dele mesmo

        // Concorrentes diretos sempre entram; os indiretos (nível 2) só se forem da mesma categoria
        // do app informado. Isso evita "ruído" (ex: redes sociais em uma busca por bancos).
        const directIds = new Set(direct.map((item) => item.appId));
        const isRelevant = (c: Candidate, d: AppDetails) =>
            directIds.has(c.appId) || !seedDetails.genreId || d.genreId === seedDetails.genreId;

        const { data, excluded } = await enrichAndFilter([...candidates.values()], f, 'similar', isRelevant);
        console.log(`✅ [similar] ${candidates.size} varridos → ${data.length} aprovados`, excluded);
        respond(res, 'similar', candidates.size, data, excluded, seed);
    } catch (error) {
        console.error('Erro na busca por similares:', error);
        res.status(502).json({ error: 'Falha ao buscar concorrentes na loja. Tente novamente em instantes.' });
    }
});

app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

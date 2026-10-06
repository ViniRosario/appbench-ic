import express, { Request, Response } from 'express';
import cors from 'cors';
import gplay from 'google-play-scraper';

const app = express();
const PORT = Number(process.env.PORT) || 3333;

app.use(cors());
app.use(express.json());

// ---------- Configurações metodológicas ----------
const MIN_SCORE = 4;          // nota mínima padrão (o usuário pode mudar na tela)
const MAX_NUM = 250;          // teto de resultados por busca no google-play-scraper
const DETAIL_CONCURRENCY = 5; // requisições simultâneas na busca de detalhes
const RETRIES = 2;            // tentativas extras em caso de erro

interface Region {
    country: string;
    lang: string;
}

const DEFAULT_REGIONS: Region[] = [{ country: 'br', lang: 'pt' }];

interface CollectedApp {
    appId: string;
    title: string;
    developer: string;
    score?: number;
    free: boolean;
    summary: string;
    url: string;
    keywords: Set<string>; // Set evita o bug de substring que existia em keywordOrigin
}

interface SearchLog {
    term: string;
    country: string;
    lang: string;
    requested: number;
    returned: number;
    error?: string;
}

// ---------- Utilitários ----------
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            await sleep(500 * (attempt + 1));
        }
    }
    throw lastError;
}

async function mapLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;

    async function worker(): Promise<void> {
        while (true) {
            const i = next++;
            if (i >= items.length) return;
            results[i] = await fn(items[i]);
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
    await Promise.all(workers);
    return results;
}

function toBaseOutput(a: CollectedApp) {
    return {
        appId: a.appId,
        title: a.title,
        developer: a.developer,
        score: a.score,
        free: a.free,
        summary: a.summary,
        url: a.url,
        keywordOrigin: Array.from(a.keywords).join(', '),
        isDuplicate: a.keywords.size > 1,
    };
}

// ---------- Endpoint ----------
app.post('/api/search', async (req: Request, res: Response): Promise<void> => {
    const { terms, limit = 100, regions, filters = {} } = req.body;

    if (!Array.isArray(terms) || terms.length === 0) {
        res.status(400).json({ error: "É necessário enviar um array de 'terms'." });
        return;
    }

    const cleanTerms: string[] = Array.from(
        new Set<string>(terms.map((t: unknown) => String(t).trim()).filter(Boolean))
    );
    const num = Math.min(Math.max(Number(limit) || 100, 1), MAX_NUM);
    // Filtros escolhidos pelo usuário na tela (com valores padrão)
    const minScore = Number.isFinite(Number(filters.minScore)) ? Number(filters.minScore) : MIN_SCORE;
    const onlyFree = Boolean(filters.onlyFree);
    const searchRegions: Region[] =
        Array.isArray(regions) && regions.length > 0
            ? regions.map((r: any) => ({ country: String(r.country), lang: String(r.lang) }))
            : DEFAULT_REGIONS;

    const appMap = new Map<string, CollectedApp>();
    const searchLog: SearchLog[] = [];
    let rawHits = 0;

    console.log(`\n⏳ FASE 1: ${cleanTerms.length} termos x ${searchRegions.length} região(ões)`);

    // FASE 1: coleta
    for (const term of cleanTerms) {
        for (const region of searchRegions) {
            try {
                const results = await withRetry(
                    () => gplay.search({ term, num, lang: region.lang, country: region.country }),
                    RETRIES
                );
                rawHits += results.length;
                searchLog.push({ term, ...region, requested: num, returned: results.length });

                for (const item of results) {
                    const existing = appMap.get(item.appId);
                    if (existing) {
                        existing.keywords.add(term);
                    } else {
                        appMap.set(item.appId, {
                            appId: item.appId,
                            title: item.title,
                            developer: item.developer,
                            score: item.score,
                            free: item.free,
                            summary: item.summary,
                            url: item.url,
                            keywords: new Set([term]),
                        });
                    }
                }
            } catch (error) {
                console.log(`⚠️ Falha na busca "${term}" (${region.country}/${region.lang})`);
                searchLog.push({
                    term,
                    ...region,
                    requested: num,
                    returned: 0,
                    error: String(error),
                });
            }
        }
    }

    if (searchLog.every((s) => s.error)) {
        res.status(502).json({ error: 'Todas as buscas falharam.', searches: searchLog });
        return;
    }

    const allApps = Array.from(appMap.values());
    console.log(`🔍 FASE 1 concluída: ${rawHits} resultados brutos, ${allApps.length} únicos.`);

    // FASE 2: filtro de nota (cada app cai em exatamente um grupo)
    const noScore = allApps.filter((a) => !a.score);
    const scored = allApps.filter((a) => a.score);
    const belowMin = scored.filter((a) => (a.score as number) < minScore);
    const passedScore = scored.filter((a) => (a.score as number) >= minScore);
    const notFree = onlyFree ? passedScore.filter((a) => !a.free) : [];
    const candidates = onlyFree ? passedScore.filter((a) => a.free) : passedScore;

    console.log(`⏳ FASE 2: buscando detalhes de ${candidates.length} apps com nota >= ${minScore}`);

    const detailRegion = searchRegions[0];

    const finalApps = await mapLimit(candidates, DETAIL_CONCURRENCY, async (a) => {
        const base = toBaseOutput(a);
        try {
            const full: any = await withRetry(
                () => gplay.app({ appId: a.appId, lang: detailRegion.lang, country: detailRegion.country }),
                RETRIES
            );
            return {
                ...base,
                updatedYear: full.updated ? new Date(full.updated).getFullYear() : null,
                installs: full.installs ?? null,       // faixa exibida na loja, ex.: "1.000.000+"
                minInstalls: full.minInstalls ?? null, // limite inferior numérico da faixa
                ratings: full.ratings ?? null,         // quantidade de avaliações
                genreId: full.genreId ?? null,
                detailsFailed: false,
            };
        } catch (error) {
            // Não descarta o app: ele passou no filtro de nota, então continua contado e sinalizado.
            console.log(`⚠️ Falha nos detalhes de ${a.appId}`);
            return {
                ...base,
                updatedYear: null,
                installs: null,
                minInstalls: null,
                ratings: null,
                genreId: null,
                detailsFailed: true,
            };
        }
    });

    const duplicatedCount = finalApps.filter((a) => a.isDuplicate).length;
    const detailsFailed = finalApps.filter((a) => a.detailsFailed).length;

    console.log(`✅ Concluído: ${finalApps.length} apps na amostra final.`);

    res.status(200).json({
        total: finalApps.length,
        duplicatedCount,
        data: finalApps,
        // Funil auditável: cada número se explica pelo anterior
        funnel: {
            rawHits,                                   // soma bruta de todas as buscas
            uniqueApps: allApps.length,                // após unir duplicatas
            duplicatesMerged: rawHits - allApps.length,
            noScore: noScore.length,                   // sem nota na busca (não entram na amostra)
            belowMinScore: belowMin.length,            // nota < MIN_SCORE
            passedScoreFilter: passedScore.length,
            notFree: notFree.length,                   // excluídos por serem pagos (filtro opcional)
            detailsFailed,                             // passaram no filtro, mas sem detalhes
            finalSample: finalApps.length,
        },
        searches: searchLog,                           // quantos resultados cada busca devolveu
        meta: {
            collectedAt: new Date().toISOString(),
            minScore,
            onlyFree,
            requestedPerSearch: num,
            regions: searchRegions,
            terms: cleanTerms,
        },
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
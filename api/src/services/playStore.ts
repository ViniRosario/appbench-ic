import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import gplay from 'google-play-scraper';
import type { IAppItem, IAppItemFullDetail } from 'google-play-scraper';
import {
    DETAILS_TTL_MS,
    RETRY_ATTEMPTS,
    RETRY_BASE_DELAY_MS,
    STORE_CONCURRENCY,
    STORE_RESULTS_LIMIT,
} from '../config.js';
import { createLimiter, withRetry } from '../lib/async.js';
import { cached } from '../lib/cache.js';
import { parseStoreDate } from '../lib/dates.js';
import { errorMessage, httpStatusOf, isNotFound } from '../lib/errors.js';
import type { AppDetails, Locale } from '../types.js';

/**
 * Acesso à Play Store. Toda chamada passa por:
 *  - um limitador global de concorrência (protege contra bloqueio do Google);
 *  - novas tentativas com backoff exponencial (exceto 404, que é definitivo);
 *  - cache curto em memória.
 */

const SIMILAR_SECTION_MISSING = 'Similar apps not found'; // mensagem da biblioteca

const limit = createLimiter(STORE_CONCURRENCY);

/** Contadores acumulados de acesso à loja (para logs e diagnóstico). */
export const storeStats = { requests: 0, retries: 0, failures: 0, totalMs: 0 };

const isRetryable = (err: unknown): boolean =>
    !isNotFound(err) && !(err instanceof Error && err.message === SIMILAR_SECTION_MISSING);

const timed = async <T>(fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    storeStats.requests++;
    try {
        return await fn();
    } finally {
        storeStats.totalMs += Date.now() - start;
    }
};

const storeCall = <T>(fn: () => Promise<T>): Promise<T> =>
    limit(() =>
        withRetry(() => timed(fn), {
            attempts: RETRY_ATTEMPTS,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            shouldRetry: isRetryable,
            onRetry: (err, attempt) => {
                storeStats.retries++;
                console.warn(`↻ nova tentativa ${attempt}: ${httpStatusOf(err) ?? ''} ${errorMessage(err).slice(0, 120)}`);
            },
        }).catch((err: unknown) => {
            storeStats.failures++;
            throw err;
        })
    );

/** A página não tem nenhuma seção de apps relacionados (nem "Apps semelhantes"). */
export const isSimilarSectionMissing = (err: unknown): boolean =>
    err instanceof Error && err.message === SIMILAR_SECTION_MISSING;

/** Nota exatamente como a loja exibe ("4,1"); '' quando o app não tem avaliações. */
function displayedScore(full: IAppItemFullDetail): { score: number | null; scoreText: string } {
    const score = typeof full.score === 'number' && full.score > 0 ? full.score : null;
    if (score === null) return { score: null, scoreText: '' };
    // Fallback raro: a loja arredonda para 1 casa (4,05 → "4,1").
    const scoreText = full.scoreText?.trim() || (Math.round(score * 10) / 10).toFixed(1).replace('.', ',');
    return { score, scoreText };
}

export function fetchDetails(appId: string, { lang, country }: Locale): Promise<AppDetails> {
    return cached(`app|${appId}|${lang}|${country}`, DETAILS_TTL_MS, () =>
        storeCall(async () => {
            const full = await gplay.app({ appId, lang, country });
            return {
                appId: full.appId,
                title: full.title ?? '',
                developer: full.developer ?? '',
                icon: full.icon ?? '',
                summary: full.summary ?? '',
                description: full.description ?? '',
                url: full.url ?? `https://play.google.com/store/apps/details?id=${appId}`,
                ...displayedScore(full),
                ratings: full.ratings ?? 0,
                installs: full.installs ?? '',
                minInstalls: full.minInstalls ?? 0,
                updated: typeof full.updated === 'number' ? full.updated : 0,
                released: parseStoreDate(full.released),
                genre: full.genre ?? '',
                genreId: full.genreId ?? '',
                free: full.free,
                price: full.price ?? 0,
                priceText: full.priceText ?? '',
                adSupported: full.adSupported === true,
                offersIAP: full.offersIAP === true,
                iapRange: full.IAPRange ?? '',
                contentRating: full.contentRating ?? '',
                fetchedAt: new Date().toISOString(),
            };
        })
    );
}

// Listas (busca e semelhantes) NÃO usam cache: a loja muda a lista ao longo do tempo (apps entram e
// saem perto do limite de 250), e cada coleta deve refletir a loja no momento em que foi feita.
// São baratas: ~3 requisições por termo.

/**
 * Lista completa que a loja devolve para o termo (até STORE_RESULTS_LIMIT), sem filtro de preço:
 * todos os critérios são aplicados depois, sobre a coleta, para o funil contar cada exclusão.
 */
export function searchApps(term: string, { lang, country }: Locale): Promise<IAppItem[]> {
    return storeCall(() => gplay.search({ term, num: STORE_RESULTS_LIMIT, lang, country, price: 'all' }));
}

/** Seção "Apps semelhantes" da página do app (lista completa, na ordem da loja). */
export function similarApps(appId: string, { lang, country }: Locale): Promise<IAppItem[]> {
    return storeCall(() => gplay.similar({ appId, lang, country }));
}

// ---------------------------------------------------------------------------
// A google-play-scraper tem um bug no `similar` (usa a 1ª seção da página, que pode ser
// "Mais de <desenvolvedor>"). A correção fica em api/patches/ e é aplicada no postinstall.
// Sem ela, o modo concorrente devolveria dados falsos — então ele é desativado.
// ---------------------------------------------------------------------------

let similarPatchApplied = false;

export async function verifySimilarPatch(): Promise<boolean> {
    try {
        const entry = fileURLToPath(import.meta.resolve('google-play-scraper'));
        const source = await readFile(join(dirname(entry), 'lib', 'similar.js'), 'utf8');
        similarPatchApplied = source.includes('[appbench patch]');
    } catch {
        similarPatchApplied = false;
    }
    return similarPatchApplied;
}

export const isSimilarAvailable = (): boolean => similarPatchApplied;

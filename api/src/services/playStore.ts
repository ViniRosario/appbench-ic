import gplay from 'google-play-scraper';
import type { IAppItem } from 'google-play-scraper';
import { DETAILS_TTL_MS, LIST_TTL_MS } from '../config.js';
import { withRetry } from '../lib/async.js';
import { cached } from '../lib/cache.js';
import type { AppDetails, Filters } from '../types.js';

/** Acesso à Play Store: toda chamada passa por cache e retry. */

type Locale = Pick<Filters, 'lang' | 'country'>;

export function fetchDetails(appId: string, { lang, country }: Locale): Promise<AppDetails> {
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

/** Versão que nunca rejeita: `null` quando o app não pôde ser lido. */
export const tryFetchDetails = (appId: string, locale: Locale): Promise<AppDetails | null> =>
    fetchDetails(appId, locale).catch(() => null);

export function searchApps(term: string, num: number, f: Filters): Promise<IAppItem[]> {
    const { lang, country, price } = f;
    return cached(`search|${term}|${num}|${price}|${lang}|${country}`, LIST_TTL_MS, () =>
        withRetry(() => gplay.search({ term, num, lang, country, price }))
    );
}

export function similarApps(appId: string, { lang, country }: Locale): Promise<IAppItem[]> {
    return cached(`similar|${appId}|${lang}|${country}`, LIST_TTL_MS, () =>
        withRetry(() => gplay.similar({ appId, lang, country }))
    );
}

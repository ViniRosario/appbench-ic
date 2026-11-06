import { ALLOWED_INSTALLS, DEFAULT_COUNTRY, DEFAULT_LANG, DEFAULT_LIMIT, MAX_LIMIT, MAX_TERMS } from './config.js';
import type { Filters } from './types.js';

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

const isLocaleCode = (v: unknown): v is string => typeof v === 'string' && /^[a-z]{2}$/i.test(v);

export const asRecord = (body: unknown): Record<string, unknown> =>
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

export function parseFilters(b: Record<string, unknown>): Filters {
    const installs = Number(b.minInstalls) || 0;
    return {
        minScore: clamp(Number(b.minScore) || 0, 0, 5),
        minInstalls: ALLOWED_INSTALLS.includes(installs) ? installs : 0,
        recentOnly: b.recentOnly === true,
        price: b.price === 'free' || b.price === 'paid' ? b.price : 'all',
        // padrão: jogos excluídos (só inclui se o cliente enviar false explicitamente)
        excludeGames: b.excludeGames !== false,
        lang: isLocaleCode(b.lang) ? b.lang.toLowerCase() : DEFAULT_LANG,
        country: isLocaleCode(b.country) ? b.country.toLowerCase() : DEFAULT_COUNTRY,
    };
}

/** Termos únicos, sem espaços nas pontas e limitados a MAX_TERMS. */
export function parseTerms(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const terms = raw.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean);
    return [...new Set(terms)].slice(0, MAX_TERMS);
}

export const parseLimit = (raw: unknown): number => clamp(Number(raw) || DEFAULT_LIMIT, 1, MAX_LIMIT);

/** Aceita um ID ("com.empresa.app") ou uma URL da Play Store com ?id=... */
export function extractAppId(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const value = input.trim();
    const fromUrl = /[?&]id=([A-Za-z0-9_.]+)/.exec(value);
    const candidate = fromUrl?.[1] ?? value;
    return /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/.test(candidate) ? candidate : null;
}

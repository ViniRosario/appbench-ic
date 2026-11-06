import { DEFAULT_COUNTRY, DEFAULT_LANG, MAX_TERMS, SUPPORTED_LANGS } from './config.js';
import type { Locale } from './types.js';

export const asRecord = (body: unknown): Record<string, unknown> =>
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

/** País (2 letras) e idioma da loja. Idiomas limitados aos que a API sabe interpretar (datas). */
export function parseLocale(b: Record<string, unknown>): Locale {
    const country = typeof b.country === 'string' && /^[a-z]{2}$/i.test(b.country) ? b.country.toLowerCase() : DEFAULT_COUNTRY;
    const lang = typeof b.lang === 'string' ? b.lang.toLowerCase() : '';
    return { country, lang: SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG };
}

/** Termos únicos (ignorando maiúsculas), sem espaços nas pontas e limitados a MAX_TERMS. */
export function parseTerms(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const terms: string[] = [];
    for (const t of raw) {
        if (typeof t !== 'string') continue;
        const term = t.trim().replace(/\s+/g, ' ');
        const key = term.toLocaleLowerCase('pt-BR');
        if (!term || seen.has(key)) continue;
        seen.add(key);
        terms.push(term);
    }
    return terms.slice(0, MAX_TERMS);
}

/** Aceita um ID ("com.empresa.app") ou uma URL da Play Store com ?id=... */
export function extractAppId(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const value = input.trim();
    const fromUrl = /[?&]id=([A-Za-z0-9_.]+)/.exec(value);
    const candidate = fromUrl?.[1] ?? value;
    return /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/.test(candidate) ? candidate : null;
}

import type { AppDetails, TermMatch, TextField } from '../types.js';

/**
 * Evidência de relevância: em que campo do app cada termo pesquisado aparece.
 * Regra (objetiva e conferível): o termo aparece como palavra(s) inteira(s), ignorando
 * acentos, maiúsculas, plural simples (-s/-es) e separadores (pré-natal = pre natal = prenatal).
 * Limitação conhecida: não reconhece sinônimos nem textos em outro idioma.
 */

const FIELDS: TextField[] = ['title', 'summary', 'description'];

const normalize = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function termPattern(term: string): RegExp | null {
    const words = normalize(term).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (words.length === 0) return null;
    const body = words.map((w) => `${w}(?:e?s)?`).join('[^\\p{L}\\p{N}]*');
    return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'u');
}

export function createTermMatcher(terms: string[]): (d: AppDetails) => TermMatch[] {
    const patterns = terms
        .map((term) => ({ term, pattern: termPattern(term) }))
        .filter((p): p is { term: string; pattern: RegExp } => p.pattern !== null);

    return (d) => {
        const texts: Record<TextField, string> = {
            title: normalize(d.title),
            summary: normalize(d.summary),
            description: normalize(d.description),
        };
        const matches: TermMatch[] = [];
        for (const { term, pattern } of patterns) {
            const field = FIELDS.find((f) => pattern.test(texts[f]));
            if (field) matches.push({ term, field });
        }
        return matches;
    };
}

/**
 * Converte a data de lançamento que a loja exibe como texto para ISO.
 * Formatos conferidos na loja: pt "28 de jan. de 2013" · en "Jan 28, 2013" · es "28 ene 2013".
 * Retorna '' quando não reconhece (nunca inventa uma data).
 */

// Três primeiras letras do mês, sem acento, em pt/en/es → índice (0 = janeiro).
const MONTHS: Record<string, number> = {
    jan: 0, ene: 0,
    fev: 1, feb: 1,
    mar: 2,
    abr: 3, apr: 3,
    mai: 4, may: 4,
    jun: 5,
    jul: 6,
    ago: 7, aug: 7,
    set: 8, sep: 8,
    out: 9, oct: 9,
    nov: 10,
    dez: 11, dec: 11, dic: 11,
};

export function parseStoreDate(text: string | undefined): string {
    if (!text) return '';
    const normalized = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const year = /\b(\d{4})\b/.exec(normalized)?.[1];
    const day = /\b(\d{1,2})\b/.exec(normalized.replace(/\b\d{4}\b/, ''))?.[1];
    const monthToken = /\b([a-z]{3,})\.?/.exec(normalized.replace(/\bde\b/g, ''))?.[1];
    const month = monthToken ? MONTHS[monthToken.slice(0, 3)] : undefined;
    if (!year || !day || month === undefined) return '';

    const date = new Date(Date.UTC(Number(year), month, Number(day)));
    // Rejeita datas impossíveis (ex.: 31 de fev.), que o Date "corrigiria" silenciosamente.
    return date.getUTCDate() === Number(day) ? date.toISOString() : '';
}

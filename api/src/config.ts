export const PORT = Number(process.env.PORT) || 3333;

// Limites de entrada
export const MAX_TERMS = 10;
export const DEFAULT_LIMIT = 50; // resultados por termo
export const MAX_LIMIT = 100;
export const ALLOWED_INSTALLS = [0, 10_000, 100_000, 1_000_000, 10_000_000];
export const DEFAULT_LANG = 'pt';
export const DEFAULT_COUNTRY = 'br';

// Extração
export const DETAIL_CONCURRENCY = 4; // requisições simultâneas ao Google
export const SIMILAR_EXPANSION = 3; // quantos concorrentes diretos também são expandidos
export const RECENT_YEARS = 2;

// Cache
export const DETAILS_TTL_MS = 6 * 60 * 60 * 1000;
export const LIST_TTL_MS = 60 * 60 * 1000;
export const CACHE_MAX_ENTRIES = 5_000;

export const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

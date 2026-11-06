export const PORT = Number(process.env.PORT) || 3333;

// Entrada
export const MAX_TERMS = 10;
export const DEFAULT_LANG = 'pt';
export const DEFAULT_COUNTRY = 'br';
/** Idiomas cujo formato de data a API interpreta (ver lib/dates.ts). */
export const SUPPORTED_LANGS = ['pt', 'en', 'es'];

/**
 * A Play Store encerra a paginação da busca em ~250 apps (medido: a loja não devolve
 * mais páginas depois disso). É também o máximo aceito pela google-play-scraper.
 * Sempre pedimos a lista completa: cortar antes descarta apps relevantes.
 */
export const STORE_RESULTS_LIMIT = 250;

/**
 * Para alguns termos a loja varia a lista entre consultas idênticas (medido: "terapia" devolveu
 * 248, 248, 250 e 250 apps, com 6 aparecendo só em parte das consultas). Por isso cada lista é
 * consultada até estabilizar — no mínimo 2 vezes, parando quando uma consulta não traz app novo —
 * e a amostra usa a união.
 */
export const LIST_MIN_PASSES = 2;
export const LIST_MAX_PASSES = 5;

// Acesso à loja
export const STORE_CONCURRENCY = 4; // requisições simultâneas à Play Store, somando todas as buscas
export const RETRY_ATTEMPTS = 4; // tentativas por requisição (backoff exponencial: 1s, 2s, 4s)
export const RETRY_BASE_DELAY_MS = 1000;
export const FINAL_RETRY_DELAY_MS = 3000; // pausa entre as releituras finais de apps que falharam

// Cache dos detalhes de cada app (curto; cada app informa quando foi lido em `fetchedAt`).
// As listas da loja nunca são cacheadas — ver services/playStore.ts.
export const DETAILS_TTL_MS = 60 * 60 * 1000;
export const CACHE_MAX_ENTRIES = 5_000;

// Coletas em segundo plano
export const JOB_TTL_MS = 30 * 60 * 1000; // por quanto tempo o resultado fica disponível
export const MAX_RUNNING_JOBS = 3;

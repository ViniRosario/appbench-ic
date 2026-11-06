/** Erro com mensagem pronta para o usuário. Qualquer outro erro vira uma mensagem genérica. */
export class UserFacingError extends Error {}

/** Status HTTP de um erro da google-play-scraper (ela anexa `status` ao erro). */
export const httpStatusOf = (err: unknown): number | undefined =>
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number' ? err.status : undefined;

export const isNotFound = (err: unknown): boolean => httpStatusOf(err) === 404;

export const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

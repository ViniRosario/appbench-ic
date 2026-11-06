export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Limita quantas tarefas rodam ao mesmo tempo (fila FIFO).
 * Uma única instância compartilhada garante o limite mesmo com várias buscas simultâneas.
 */
export function createLimiter(concurrency: number) {
    let active = 0;
    const queue: (() => void)[] = [];

    const next = (): void => {
        if (active >= concurrency) return;
        const start = queue.shift();
        if (!start) return;
        active++;
        start();
    };

    return function limit<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            queue.push(() => {
                task()
                    .then(resolve, reject)
                    .finally(() => {
                        active--;
                        next();
                    });
            });
            next();
        });
    };
}

interface RetryOptions {
    attempts: number;
    baseDelayMs: number;
    shouldRetry: (err: unknown) => boolean;
    onRetry?: (err: unknown, attempt: number) => void;
}

/** Repete `fn` com backoff exponencial (+ variação aleatória) enquanto `shouldRetry` permitir. */
export async function withRetry<T>(fn: () => Promise<T>, { attempts, baseDelayMs, shouldRetry, onRetry }: RetryOptions): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt === attempts - 1 || !shouldRetry(err)) break;
            onRetry?.(err, attempt + 1);
            const delay = baseDelayMs * 2 ** attempt;
            await sleep(delay + Math.random() * delay * 0.3);
        }
    }
    throw lastError;
}

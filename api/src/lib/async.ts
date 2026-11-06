/** Executa `fn` sobre os itens com no máximo `concurrency` execuções simultâneas, preservando a ordem. */
export async function mapLimit<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i] as T);
        }
    });
    await Promise.all(workers);
    return results;
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError;
}

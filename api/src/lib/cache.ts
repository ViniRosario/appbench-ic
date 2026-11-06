import { CACHE_MAX_ENTRIES } from '../config.js';

// Cache em memória: reduz requisições repetidas ao Google (e o risco de bloqueio).
// Falhas nunca são guardadas: uma nova chamada tenta de novo.
const store = new Map<string, { expires: number; value: unknown }>();
// Requisições em andamento: chamadas simultâneas com a mesma chave compartilham a mesma promessa.
const inflight = new Map<string, Promise<unknown>>();

/** Remove entradas expiradas e, se ainda estiver cheio, as mais antigas (Map mantém ordem de inserção). */
function evict(): void {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (entry.expires <= now) store.delete(key);
    }
    for (const key of store.keys()) {
        if (store.size < CACHE_MAX_ENTRIES) break;
        store.delete(key);
    }
}

export function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const hit = store.get(key);
    if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T);

    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = fn()
        .then((value) => {
            if (store.size >= CACHE_MAX_ENTRIES) evict();
            store.set(key, { expires: Date.now() + ttl, value });
            return value;
        })
        .finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
}

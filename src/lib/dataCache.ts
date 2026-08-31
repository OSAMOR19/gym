/**
 * dataCache — tiny in-memory TTL cache for Supabase reads.
 *
 * Screens like the dashboard, progress, and notifications re-fetch the same
 * slow-changing data on every visit (stats, records, program progress,
 * recent sessions). Wrapping those reads in cached() makes in-app navigation
 * instant; every write path calls invalidateDataCache() so nothing stays
 * stale after a workout saves.
 *
 * Deliberately memory-only: survives client-side navigation (the SPA case
 * that hurt), disappears on reload — no serialization bugs, no stale
 * cross-session state, Dates stay Dates.
 */

interface Entry {
    value: unknown;
    expires: number;
}

const store = new Map<string, Entry>();

/** Fired whenever the cache is invalidated, for screens that want to react. */
export const DATA_INVALIDATED_EVENT = 'irontrack-data-invalidated';

/**
 * Return the cached value for `key` if fresh, else run `fetcher` and cache
 * its result for `ttlMs`. Concurrent callers share the same in-flight fetch.
 */
export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const hit = store.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as T;

    const inflight = pending.get(key);
    if (inflight) return inflight as Promise<T>;

    const promise = (async () => {
        try {
            const value = await fetcher();
            store.set(key, { value, expires: Date.now() + ttlMs });
            return value;
        } finally {
            pending.delete(key);
        }
    })();
    pending.set(key, promise);
    return promise;
}

const pending = new Map<string, Promise<unknown>>();

/** Drop everything (or keys under a prefix). Call after any write. */
export function invalidateDataCache(prefix?: string): void {
    if (!prefix) {
        store.clear();
    } else {
        for (const key of Array.from(store.keys())) {
            if (key.startsWith(prefix)) store.delete(key);
        }
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(DATA_INVALIDATED_EVENT));
    }
}

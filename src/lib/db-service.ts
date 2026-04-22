/**
 * Persistent caching layer with IndexedDB + localStorage fallback.
 *
 * Safari (especially private-browsing mode) can silently hang or throw
 * when opening IndexedDB.  This wrapper detects that within a short
 * timeout and transparently falls back to localStorage so the app
 * never gets stuck on a loading screen.
 */

const DB_NAME = "toolpix_ai_cache";
const STORE_NAME = "cache_store";
const DB_VERSION = 1;
const IDB_OPEN_TIMEOUT_MS = 3000; // max time to wait for IndexedDB.open
const LS_PREFIX = "idb_fallback_"; // namespace for fallback keys

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// ── localStorage fallback helpers ──────────────────────────────────────
function lsGet<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(LS_PREFIX + key);
        if (!raw) return null;
        const entry = JSON.parse(raw) as CacheEntry<T>;
        return entry ? entry.data : null;
    } catch {
        return null;
    }
}

function lsGetWithTTL<T>(key: string, ttl: number): T | null {
    try {
        const raw = localStorage.getItem(LS_PREFIX + key);
        if (!raw) return null;
        const entry = JSON.parse(raw) as CacheEntry<T>;
        if (!entry) return null;
        if (Date.now() - entry.timestamp > ttl) {
            localStorage.removeItem(LS_PREFIX + key);
            return null;
        }
        return entry.data;
    } catch {
        return null;
    }
}

function lsSet<T>(key: string, data: T): void {
    try {
        const entry: CacheEntry<T> = { data, timestamp: Date.now() };
        localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
    } catch {
        // localStorage full or unavailable – silently ignore
    }
}

function lsDelete(key: string): void {
    try { localStorage.removeItem(LS_PREFIX + key); } catch { /* ignore */ }
}

function lsClear(): void {
    try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith(LS_PREFIX)) toRemove.push(k);
        }
        toRemove.forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
}

// ── Main CacheDB class ────────────────────────────────────────────────
class CacheDB {
    private dbPromise: Promise<IDBDatabase | null> | null = null;
    private db: IDBDatabase | null = null;
    /** Set to true once we know IDB is unusable in this session */
    private useFallback = false;

    private async getDB(): Promise<IDBDatabase | null> {
        // Already determined IDB is broken – skip immediately.
        if (this.useFallback) return null;
        if (this.db) return this.db;
        if (this.dbPromise) return this.dbPromise;

        // Guard: if indexedDB global isn't even available (e.g. older Safari,
        // or fully blocked), go straight to fallback.
        if (typeof indexedDB === "undefined") {
            console.warn("[IDB_CACHE] indexedDB not available, using localStorage fallback");
            this.useFallback = true;
            return null;
        }

        this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
            // Timeout – if IDB.open doesn't settle in time, give up.
            const timer = setTimeout(() => {
                console.warn("[IDB_CACHE] indexedDB.open timed out, falling back to localStorage");
                this.useFallback = true;
                this.dbPromise = null;
                resolve(null);
            }, IDB_OPEN_TIMEOUT_MS);

            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (event) => {
                    const database = (event.target as IDBOpenDBRequest).result;
                    if (!database.objectStoreNames.contains(STORE_NAME)) {
                        database.createObjectStore(STORE_NAME);
                    }
                };

                request.onsuccess = (event) => {
                    clearTimeout(timer);
                    this.db = (event.target as IDBOpenDBRequest).result;

                    // Safari may close the connection unexpectedly.
                    this.db.onclose = () => {
                        this.db = null;
                    };

                    this.dbPromise = null;
                    resolve(this.db);
                };

                request.onerror = (event) => {
                    clearTimeout(timer);
                    console.warn("[IDB_CACHE] indexedDB.open failed:", (event.target as IDBOpenDBRequest).error);
                    this.useFallback = true;
                    this.dbPromise = null;
                    resolve(null);
                };

                request.onblocked = () => {
                    clearTimeout(timer);
                    console.warn("[IDB_CACHE] indexedDB.open blocked, using localStorage fallback");
                    this.useFallback = true;
                    this.dbPromise = null;
                    resolve(null);
                };
            } catch (e) {
                clearTimeout(timer);
                console.warn("[IDB_CACHE] indexedDB.open threw:", e);
                this.useFallback = true;
                this.dbPromise = null;
                resolve(null);
            }
        });

        return this.dbPromise;
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const db = await this.getDB();
            if (!db) return lsGet<T>(key);

            return new Promise((resolve) => {
                const transaction = db.transaction(STORE_NAME, "readonly");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(key);

                request.onsuccess = () => {
                    const entry = request.result as CacheEntry<T>;
                    resolve(entry ? entry.data : null);
                };

                request.onerror = () => {
                    console.warn("[IDB_CACHE] get failed for key:", key);
                    resolve(lsGet<T>(key));
                };
            });
        } catch (e) {
            console.error("[IDB_CACHE] Error getting key:", key, e);
            return lsGet<T>(key);
        }
    }

    async getWithTTL<T>(key: string, ttl: number): Promise<T | null> {
        try {
            const db = await this.getDB();
            if (!db) return lsGetWithTTL<T>(key, ttl);

            return new Promise((resolve) => {
                const transaction = db.transaction(STORE_NAME, "readonly");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(key);

                request.onsuccess = () => {
                    const entry = request.result as CacheEntry<T>;
                    if (!entry) {
                        resolve(null);
                        return;
                    }
                    if (Date.now() - entry.timestamp > ttl) {
                        this.delete(key);
                        resolve(null);
                    } else {
                        resolve(entry.data);
                    }
                };

                request.onerror = () => resolve(lsGetWithTTL<T>(key, ttl));
            });
        } catch (e) {
            return lsGetWithTTL<T>(key, ttl);
        }
    }

    async set<T>(key: string, data: T): Promise<void> {
        try {
            const db = await this.getDB();
            if (!db) { lsSet(key, data); return; }

            return new Promise((resolve) => {
                const transaction = db.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const entry: CacheEntry<T> = { data, timestamp: Date.now() };
                const request = store.put(entry, key);

                request.onsuccess = () => resolve();
                request.onerror = () => {
                    console.warn("[IDB_CACHE] set failed for key:", key, "— falling back to localStorage");
                    lsSet(key, data);
                    resolve();
                };
            });
        } catch (e) {
            console.error("[IDB_CACHE] Error setting key:", key, e);
            lsSet(key, data);
        }
    }

    async delete(key: string): Promise<void> {
        try {
            const db = await this.getDB();
            if (!db) { lsDelete(key); return; }

            return new Promise((resolve) => {
                const transaction = db.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(key);

                request.onsuccess = () => resolve();
                request.onerror = () => {
                    lsDelete(key);
                    resolve();
                };
            });
        } catch (e) {
            console.error("[IDB_CACHE] Error deleting key:", key, e);
            lsDelete(key);
        }
    }

    async clear(): Promise<void> {
        try {
            const db = await this.getDB();
            if (!db) { lsClear(); return; }

            return new Promise((resolve) => {
                const transaction = db.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => {
                    lsClear();
                    resolve();
                };
            });
        } catch (e) {
            console.error("[IDB_CACHE] Error clearing store:", e);
            lsClear();
        }
    }
}

export const cacheDB = new CacheDB();

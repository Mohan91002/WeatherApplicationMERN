/**
 * A tiny in-memory TTL cache — the Node/Express equivalent of the .NET
 * `IMemoryCache` the original API used. Shared across all clients of a single
 * process, it keeps us within Open-Meteo's rate limits by serving one hourly
 * upstream fetch to every browser.
 *
 * (For a multi-instance deployment this would move to Redis; a single instance
 * is enough for this reference app.)
 */
export class TtlCache {
  constructor() {
    /** @type {Map<string, { value: unknown, expiresAt: number }>} */
    this._store = new Map();
  }

  /**
   * Returns the cached value if present and still fresh, otherwise undefined.
   * @template T
   * @param {string} key
   * @returns {T | undefined}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return undefined;
    }
    return /** @type {T} */ (entry.value);
  }

  /**
   * Stores a value for `ttlMs` milliseconds.
   * @param {string} key
   * @param {unknown} value
   * @param {number} ttlMs
   */
  set(key, value, ttlMs) {
    this._store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Clears everything (used by tests). */
  clear() {
    this._store.clear();
  }
}

/** Process-wide shared cache instance. */
export const cache = new TtlCache();

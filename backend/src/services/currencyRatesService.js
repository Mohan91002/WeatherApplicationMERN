import { cache } from './cache.js';

// Free, no API key required. USD base, ~160 currencies.
const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_KEY = 'fx-rates-usd-v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Provides live foreign-exchange rates (units of a currency per 1 USD),
 * fetched from a public API and cached. Backend-owned, like the weather
 * integration.
 *
 * Returns cached rates if still fresh, otherwise fetches them. Keyed by ISO
 * 4217 currency code; the value is how many units of that currency equal
 * 1 USD. Returns an empty map if the host cannot reach the FX API.
 *
 * @returns {Promise<Record<string, number>>}
 */
export async function getRates() {
  const cached = cache.get(CACHE_KEY);
  if (cached) return cached;

  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetchJson(RATES_URL);
      if (response && response.result === 'success' && response.rates && Object.keys(response.rates).length > 0) {
        cache.set(CACHE_KEY, response.rates, CACHE_TTL_MS);
        return response.rates;
      }
      console.warn('[fx] FX API returned no usable rates.');
      return {};
    } catch (err) {
      if (attempt < 1) {
        console.debug(`[fx] request failed (attempt ${attempt + 1}); retrying.`);
        await delay(2000);
        continue;
      }
      console.warn(`[fx] request failed; returning no rates (${err instanceof Error ? err.message : err}).`);
      return {};
    }
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

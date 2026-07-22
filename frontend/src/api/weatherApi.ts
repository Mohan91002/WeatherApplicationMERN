import type { RegionWeather } from '../types/regionWeather';

/**
 * Talks to the World Weather API for the live weather + air quality for every
 * country.
 *
 * All business logic — the country dataset, the Open-Meteo integration, the
 * merge and the weather/AQI classification — lives in the backend. The primary
 * path is a single call to GET /api/regions.
 *
 * If the backend host cannot reach Open-Meteo (e.g. blocked outbound HTTPS),
 * the client falls back to relaying: it fetches the coordinates from the
 * backend, calls Open-Meteo from the browser, and POSTs the raw results back to
 * /api/regions/merge so the backend still performs all merging and
 * classification. The browser is only a network relay — it holds no business
 * logic. Results are cached in localStorage for an hour.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const REGIONS_URL = `${BASE_URL}/api/regions`;
const COUNTRIES_URL = `${BASE_URL}/api/countries`;
const MERGE_URL = `${BASE_URL}/api/regions/merge`;
const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const EXCHANGE_RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const CHUNK_SIZE = 200;
const CACHE_KEY = 'weatherCacheV2';
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Country coordinates served by the API (GET /api/countries). */
interface CountryInfo {
  readonly country: string;
  readonly capital: string;
  readonly code: string;
  readonly flag: string;
  readonly latitude: number;
  readonly longitude: number;
}

/** One raw Open-Meteo forecast location result (relayed to the backend as-is). */
interface ForecastResult {
  readonly timezone?: string;
  readonly current?: { readonly temperature_2m: number; readonly weather_code: number };
}

/** One raw Open-Meteo air-quality location result (relayed to the backend as-is). */
interface AirQualityResult {
  readonly current?: { readonly us_aqi: number };
}

/** Raw open.er-api.com response (USD base). */
interface ExchangeRatesResponse {
  readonly result?: string;
  readonly rates?: Record<string, number>;
}

interface WeatherCache {
  readonly ts: number;
  readonly data: RegionWeather[];
}

/**
 * Returns cached live weather + air quality if still fresh; otherwise asks the
 * backend (GET /api/regions) and, only if the backend could not reach
 * Open-Meteo, falls back to the browser relay.
 */
export async function getLiveRegions(): Promise<RegionWeather[]> {
  const cached = readCache();
  if (cached) return cached;

  let regions: RegionWeather[] = [];
  try {
    regions = await getJson<RegionWeather[]>(REGIONS_URL);
  } catch {
    regions = [];
  }

  const data = hasLiveData(regions) ? regions : await fetchViaBrowserRelay();
  writeCache(data);
  return data;
}

/**
 * Fallback for when the backend host cannot reach the upstream APIs: fetch the
 * coordinates from the backend, query Open-Meteo and the FX API from the
 * browser, then POST the raw results back so the backend does all
 * merging/classification.
 */
async function fetchViaBrowserRelay(): Promise<RegionWeather[]> {
  try {
    const countries = await getJson<CountryInfo[]>(COUNTRIES_URL);
    const chunks = chunk(countries, CHUNK_SIZE);

    const parts = await Promise.all(chunks.map((c) => fetchChunk(c)));
    const weather = parts.reduce<{ forecast: ForecastResult[]; air: AirQualityResult[] }>(
      (acc, part) => ({
        forecast: [...acc.forecast, ...part.forecast],
        air: [...acc.air, ...part.air],
      }),
      { forecast: [], air: [] },
    );
    const rates = await fetchRates();

    try {
      return await postJson<RegionWeather[]>(MERGE_URL, { ...weather, rates });
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

/** Fetches live USD-based exchange rates from the browser (relay fallback). */
async function fetchRates(): Promise<Record<string, number>> {
  try {
    const response = await withRetry(() => getJson<ExchangeRatesResponse>(EXCHANGE_RATES_URL));
    return response.rates ?? {};
  } catch {
    return {};
  }
}

/**
 * Queries Open-Meteo for one chunk of countries and returns the raw forecast
 * and air-quality arrays, padded to the chunk size so they stay index-aligned
 * with the country list even when a request fails.
 */
async function fetchChunk(
  countries: CountryInfo[],
): Promise<{ forecast: ForecastResult[]; air: AirQualityResult[] }> {
  const latitude = countries.map((c) => c.latitude).join(',');
  const longitude = countries.map((c) => c.longitude).join(',');

  const forecastUrl = `${OPEN_METEO_FORECAST}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
  const airUrl = `${OPEN_METEO_AIR}?latitude=${latitude}&longitude=${longitude}&current=us_aqi`;

  const [forecast, air] = await Promise.all([
    withRetry(() => getJson<ForecastResult[] | ForecastResult>(forecastUrl))
      .then(toArray)
      .catch(() => [] as ForecastResult[]),
    withRetry(() => getJson<AirQualityResult[] | AirQualityResult>(airUrl))
      .then(toArray)
      .catch(() => [] as AirQualityResult[]),
  ]);

  return {
    forecast: padTo(countries.length, forecast),
    air: padTo(countries.length, air),
  };
}

function hasLiveData(regions: RegionWeather[]): boolean {
  return regions.length > 0 && regions.some((r) => r.weatherCode >= 0 || r.aqi >= 0);
}

function readCache(): RegionWeather[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherCache;
    const fresh = Date.now() - parsed.ts < CACHE_TTL_MS;
    return fresh && Array.isArray(parsed.data) && parsed.data.length > 0 ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeCache(data: RegionWeather[]): void {
  // Only cache a result that actually contains live data, so a rate-limited
  // (blank) response is not persisted for an hour.
  if (!hasLiveData(data)) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // Ignore storage failures (e.g. private mode / quota).
  }
}

function toArray<T>(value: T[] | T): T[] {
  return Array.isArray(value) ? value : [value];
}

/** Pads (or trims) an array to exactly `size` entries, using {} for gaps. */
function padTo<T extends object>(size: number, items: T[]): T[] {
  if (items.length >= size) return items.slice(0, size);
  const gaps = Array.from({ length: size - items.length }, () => ({}) as T);
  return [...items, ...gaps];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Runs `fn`, retrying once after a 2s delay — mirrors the original retry(1). */
async function withRetry<T>(fn: () => Promise<T>, delayMs = 2000): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fn();
  }
}

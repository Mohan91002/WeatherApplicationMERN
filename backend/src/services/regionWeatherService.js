import { cache } from './cache.js';
import { getRates } from './currencyRatesService.js';
import { describeWeatherCode, aqiCategory, toFahrenheit } from './weatherClassifier.js';

/**
 * Owns the live weather + air-quality integration for every country: fetching
 * from Open-Meteo, merging with the country dataset, and classifying the
 * results. All of this is backend logic; the frontend only renders it.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const CHUNK_SIZE = 200;
const CACHE_KEY = 'live-regions-v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * @typedef {import('../data/countries.js').CountryInfo} CountryInfo
 * @typedef {Object} RegionWeather Fully classified row served to the SPA.
 */

/**
 * Returns cached live weather + air quality if still fresh, otherwise fetches
 * it from Open-Meteo (chunked) and caches the result. Returns entries with
 * placeholder values (temperature 0, AQI -1) when the host cannot reach
 * Open-Meteo — the caller can detect this and fall back to the browser relay.
 *
 * @param {CountryInfo[]} countries
 * @returns {Promise<RegionWeather[]>}
 */
export async function getLiveRegions(countries) {
  const cached = cache.get(CACHE_KEY);
  if (cached) return cached;

  const rates = await getRates();
  /** @type {RegionWeather[]} */
  const results = [];
  for (const batch of chunk(countries, CHUNK_SIZE)) {
    const { forecast, air } = await fetchChunk(batch);
    results.push(...merge(batch, forecast, air, rates));
  }

  // Only cache a result that actually contains live data, so a blocked or
  // rate-limited (blank) response is not persisted for an hour.
  if (results.some((r) => r.weatherCode >= 0 || r.aqi >= 0)) {
    cache.set(CACHE_KEY, results, CACHE_TTL_MS);
  }

  return results;
}

/**
 * Merges raw Open-Meteo results — relayed by the browser when the backend host
 * cannot reach Open-Meteo — against the full country dataset. The forecast/air
 * arrays are index-aligned with `countries`; rates are keyed by currency code.
 *
 * @param {CountryInfo[]} countries
 * @param {{ forecast?: any[], air?: any[], rates?: Record<string, number> }} body
 * @returns {RegionWeather[]}
 */
export function mergeRelayed(countries, body) {
  return merge(countries, body.forecast ?? [], body.air ?? [], body.rates ?? {});
}

/**
 * Fetches one chunk of countries from Open-Meteo (forecast + air quality in
 * parallel) and returns the raw, index-aligned arrays.
 * @param {CountryInfo[]} countries
 */
async function fetchChunk(countries) {
  const latitude = countries.map((c) => c.latitude).join(',');
  const longitude = countries.map((c) => c.longitude).join(',');

  const forecastUrl = `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
  const airUrl = `${AIR_QUALITY_URL}?latitude=${latitude}&longitude=${longitude}&current=us_aqi`;

  const [forecast, air] = await Promise.all([getArray(forecastUrl), getArray(airUrl)]);
  return { forecast, air };
}

/**
 * GETs a JSON payload and normalises it to an array, retrying once. Any failure
 * (including a sandbox's blocked outbound HTTPS) yields an empty array so one
 * location's failure never blanks the others.
 * @param {string} url
 * @returns {Promise<any[]>}
 */
async function getArray(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Open-Meteo returns an array for many coordinates and a bare object for one.
      return Array.isArray(json) ? json : [json];
    } catch (err) {
      if (attempt < 1) {
        console.debug(`[weather] Open-Meteo request failed (attempt ${attempt + 1}); retrying.`);
        await delay(2000);
        continue;
      }
      console.warn(`[weather] Open-Meteo request failed; empty result for this chunk (${err instanceof Error ? err.message : err}).`);
      return [];
    }
  }
}

/**
 * Combines the country dataset with the forecast and air-quality results
 * (index-aligned) into fully classified RegionWeather rows. Missing entries
 * fall back to placeholder values.
 *
 * @param {CountryInfo[]} countries
 * @param {any[]} forecast
 * @param {any[]} air
 * @param {Record<string, number>} rates
 * @returns {RegionWeather[]}
 */
function merge(countries, forecast, air, rates) {
  return countries.map((country, i) => {
    const current = forecast[i]?.current ?? null;
    const temperatureC = current ? Math.round(current.temperature_2m) : 0;
    const weatherCode = current?.weather_code ?? -1;

    const usAqi = air[i]?.current?.us_aqi;
    const aqi = usAqi != null ? Math.round(usAqi) : -1;

    const currencyRate =
      country.currencyCode && rates[country.currencyCode] != null ? rates[country.currencyCode] : -1;

    return {
      country: country.country,
      capital: country.capital,
      code: country.code,
      flag: country.flag,
      timeZone: forecast[i]?.timezone ?? 'UTC',
      latitude: country.latitude,
      longitude: country.longitude,
      temperatureC,
      temperatureF: toFahrenheit(temperatureC),
      weatherCode,
      summary: describeWeatherCode(weatherCode),
      aqi,
      aqiCategory: aqiCategory(aqi),
      currencyCode: country.currencyCode,
      currencySymbol: country.currencySymbol || country.currencyCode,
      currencyRate,
      establishedYear: country.establishedYear,
      officialLanguage: country.officialLanguage,
    };
  });
}

/** Yields successive `size`-length slices of `items`. */
function* chunk(items, size) {
  for (let i = 0; i < items.length; i += size) {
    yield items.slice(i, i + size);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

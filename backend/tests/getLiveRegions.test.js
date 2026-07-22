import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getLiveRegions } from '../src/services/regionWeatherService.js';
import { countries } from '../src/data/countries.js';
import { cache } from '../src/services/cache.js';

// Exercises the primary /api/regions path end-to-end with a stubbed fetch.
// (Regression guard: the chunk() generator once collided with the loop
// variable, throwing a TDZ ReferenceError that only this path hits.)

const realFetch = global.fetch;

/** Number of coordinates encoded in an Open-Meteo request URL. */
function countCoords(url) {
  const lat = new URL(url).searchParams.get('latitude') || '';
  return lat ? lat.split(',').length : 0;
}

beforeEach(() => cache.clear());
afterEach(() => {
  global.fetch = realFetch;
  cache.clear();
});

test('getLiveRegions fetches, merges and classifies every country without throwing', async () => {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('er-api.com')) {
      return { ok: true, json: async () => ({ result: 'success', rates: { INR: 83, AFN: 70 } }) };
    }
    if (u.includes('/v1/forecast')) {
      const n = countCoords(u);
      return {
        ok: true,
        json: async () =>
          Array.from({ length: n }, () => ({ timezone: 'UTC', current: { temperature_2m: 20, weather_code: 0 } })),
      };
    }
    if (u.includes('air-quality')) {
      const n = countCoords(u);
      return { ok: true, json: async () => Array.from({ length: n }, () => ({ current: { us_aqi: 42 } })) };
    }
    throw new Error(`unexpected url: ${u}`);
  };

  const regions = await getLiveRegions(countries);

  assert.equal(regions.length, countries.length);
  const first = regions[0];
  assert.equal(first.temperatureC, 20);
  assert.equal(first.temperatureF, 68); // 20C -> 68F
  assert.equal(first.summary, 'Clear sky'); // weather_code 0
  assert.equal(first.aqi, 42);
  assert.equal(first.aqiCategory, 'Good');
});

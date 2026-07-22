import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeRelayed } from '../src/services/regionWeatherService.js';
import { countries } from '../src/data/countries.js';

test('mergeRelayed classifies the first station from relayed data', () => {
  const body = {
    forecast: [{ timezone: 'Asia/Kabul', current: { temperature_2m: 30.6, weather_code: 95 } }],
    air: [{ current: { us_aqi: 175 } }],
    rates: { AFN: 70.0 },
  };

  const result = mergeRelayed(countries, body);

  assert.equal(result.length, countries.length);

  // countries[0] is Afghanistan (code af, currency AFN, established 1709).
  const afghanistan = result[0];
  assert.equal(afghanistan.country, 'Afghanistan');
  assert.equal(afghanistan.capital, 'Kabul');
  assert.equal(afghanistan.temperatureC, 31); // 30.6 rounded
  assert.equal(afghanistan.temperatureF, 88); // 31C -> 88F
  assert.equal(afghanistan.weatherCode, 95);
  assert.equal(afghanistan.summary, 'Thunderstorm');
  assert.equal(afghanistan.aqi, 175);
  assert.equal(afghanistan.aqiCategory, 'Unhealthy');
  assert.equal(afghanistan.currencyCode, 'AFN');
  assert.equal(afghanistan.currencyRate, 70.0);
  assert.equal(afghanistan.establishedYear, 1709);
  assert.equal(afghanistan.timeZone, 'Asia/Kabul');
  assert.equal(afghanistan.officialLanguage, 'Pashto, Dari');
});

test('mergeRelayed fills placeholders when a station has no data', () => {
  // Provide data only for index 0; every other station must fall back safely.
  const body = {
    forecast: [{ current: { temperature_2m: 10, weather_code: 1 } }],
    air: [{ current: { us_aqi: 20 } }],
    rates: {},
  };

  const missing = mergeRelayed(countries, body)[1]; // no relayed data for this station

  assert.equal(missing.temperatureC, 0);
  assert.equal(missing.temperatureF, 32); // 0C -> 32F
  assert.equal(missing.weatherCode, -1);
  assert.equal(missing.summary, 'Unavailable');
  assert.equal(missing.aqi, -1);
  assert.equal(missing.aqiCategory, 'N/A');
  assert.equal(missing.currencyRate, -1); // no rate supplied
  assert.equal(missing.timeZone, 'UTC');
  assert.ok(missing.currencyCode.length > 0); // static country data still present
});

test('mergeRelayed leaves currency rate unavailable when code missing from rates', () => {
  const body = {
    forecast: [{ current: { temperature_2m: 20, weather_code: 0 } }],
    air: [{ current: { us_aqi: 10 } }],
    rates: { ZZZ: 5 }, // unrelated currency
  };

  const afghanistan = mergeRelayed(countries, body)[0];

  assert.equal(afghanistan.currencyRate, -1);
});

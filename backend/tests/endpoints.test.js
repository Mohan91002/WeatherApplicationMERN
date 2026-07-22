import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

// The app is driven in-memory (no MongoDB, no live network). /api/countries and
// /api/regions/merge fall back to the bundled country seed, so they are fully
// testable offline. /api/regions is not exercised here as it calls Open-Meteo.
const app = createApp();

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
});

test('GET /api/countries returns the full dataset', async () => {
  const res = await request(app).get('/api/countries');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 253);
  const india = res.body.find((c) => c.country === 'India');
  assert.equal(india.officialLanguage, 'Hindi, English');
});

test('POST /api/regions/merge classifies relayed data', async () => {
  const body = {
    forecast: [{ timezone: 'Asia/Kabul', current: { temperature_2m: 30.6, weather_code: 95 } }],
    air: [{ current: { us_aqi: 175 } }],
    rates: { AFN: 70 },
  };

  const res = await request(app).post('/api/regions/merge').send(body);

  assert.equal(res.status, 200);
  assert.equal(res.body.length, 253);

  const afghanistan = res.body[0];
  assert.equal(afghanistan.summary, 'Thunderstorm');
  assert.equal(afghanistan.temperatureF, 88);
  assert.equal(afghanistan.aqiCategory, 'Unhealthy');
  assert.equal(afghanistan.currencyRate, 70);
  assert.equal(afghanistan.establishedYear, 1709);
});

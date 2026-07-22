import { Router } from 'express';
import { getCountries } from '../config/db.js';
import { getLiveRegions, mergeRelayed } from '../services/regionWeatherService.js';

/**
 * Every HTTP route the API exposes. Kept separate from the app wiring
 * (`app.js`) so the middleware and the routes read independently.
 */
export const weatherRoutes = Router();

// Liveness/readiness probe for the load balancer / platform health check.
weatherRoutes.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

// The country dataset, owned by the backend (Mongo-backed, seed fallback). Also
// used by the browser fallback to know which coordinates to query.
weatherRoutes.get('/api/countries', async (_req, res, next) => {
  try {
    res.json(await getCountries());
  } catch (err) {
    next(err);
  }
});

// Live weather + air quality for every country, fetched and merged server-side.
// Returns placeholder rows if the host cannot reach Open-Meteo (the client then
// falls back to relaying the data itself).
weatherRoutes.get('/api/regions', async (_req, res, next) => {
  try {
    const countries = await getCountries();
    res.json(await getLiveRegions(countries));
  } catch (err) {
    next(err);
  }
});

// Fallback: the browser relays raw Open-Meteo results and the backend performs
// all merging and classification. No business logic in the client.
weatherRoutes.post('/api/regions/merge', async (req, res, next) => {
  try {
    const countries = await getCountries();
    res.json(mergeRelayed(countries, req.body ?? {}));
  } catch (err) {
    next(err);
  }
});

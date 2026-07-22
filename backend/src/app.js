import express from 'express';
import cors from 'cors';
import { weatherRoutes } from './routes/weatherRoutes.js';

/**
 * Builds the Express app (kept separate from the server bootstrap so tests can
 * import it and drive it in-memory with supertest — the Node equivalent of the
 * .NET `WebApplicationFactory`).
 *
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express();

  // Allowed SPA origins. Defaults to the React (Vite) dev server; in production
  // set CORS_ALLOWED_ORIGINS to a comma-separated list, e.g.
  //   CORS_ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '5mb' })); // relayed payloads can be large

  app.use(weatherRoutes);

  // 404 for anything unmatched.
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('[api] unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

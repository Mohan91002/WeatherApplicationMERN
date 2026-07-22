import { createApp } from './app.js';
import { connectDb } from './config/db.js';

/**
 * Server bootstrap: connect to MongoDB (seeding the country data on first run,
 * degrading gracefully to the in-memory seed if Mongo is down), then start
 * listening. The Node/Express counterpart of the old .NET `Program.cs`.
 */
const PORT = Number(process.env.PORT) || 5135;

await connectDb();

const app = createApp();

app.listen(PORT, () => {
  console.log(`[api] World Weather API listening on http://localhost:${PORT}`);
  console.log(`[api] CORS origins: ${process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173'}`);
});

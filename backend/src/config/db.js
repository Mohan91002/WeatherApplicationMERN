import mongoose from 'mongoose';
import { Country } from '../models/Country.js';
import { countries as seedCountries } from '../data/countries.js';

/**
 * Connection state for the rest of the app to consult. When MongoDB is
 * unreachable we degrade gracefully: `connected` stays false and the country
 * service falls back to the in-memory seed array, so the app still runs for
 * demos without a database.
 */
export const dbState = { connected: false };

/**
 * Connects to MongoDB and seeds the `countries` collection if it is empty.
 * Never throws: a failed connection logs a warning and leaves the app running
 * on the in-memory seed (see {@link getCountries}).
 *
 * @param {string} [uri] Mongo connection string (defaults to MONGODB_URI env
 *   or a local instance).
 */
export async function connectDb(uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/weather') {
  try {
    // Fail fast instead of buffering commands for 30s when Mongo is down.
    mongoose.set('bufferCommands', false);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    dbState.connected = true;
    console.log(`[db] connected to MongoDB (${redact(uri)})`);
    await seedCountriesIfEmpty();
  } catch (err) {
    dbState.connected = false;
    console.warn(
      `[db] MongoDB unavailable (${err instanceof Error ? err.message : err}); ` +
        'falling back to the in-memory country seed. Set MONGODB_URI to enable persistence.',
    );
  }
}

/** Seeds the collection from the bundled dataset the first time it is empty. */
async function seedCountriesIfEmpty() {
  const count = await Country.estimatedDocumentCount();
  if (count > 0) {
    console.log(`[db] countries collection already has ${count} documents; skipping seed.`);
    return;
  }
  await Country.insertMany(seedCountries, { ordered: true });
  console.log(`[db] seeded ${seedCountries.length} countries into MongoDB.`);
}

/**
 * Returns the full country list — from MongoDB when connected, otherwise from
 * the bundled seed. Callers get the same shape either way.
 *
 * @returns {Promise<import('../data/countries.js').CountryInfo[]>}
 */
export async function getCountries() {
  if (dbState.connected) {
    try {
      const docs = await Country.find({}, { _id: 0, __v: 0 }).lean();
      if (docs.length > 0) {
        return /** @type {any} */ (docs);
      }
    } catch (err) {
      console.warn(`[db] country query failed (${err instanceof Error ? err.message : err}); using seed.`);
    }
  }
  return seedCountries;
}

/** Closes the connection (used by tests). */
export async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  dbState.connected = false;
}

/** Hides credentials in a Mongo URI before logging it. */
function redact(uri) {
  return uri.replace(/\/\/([^@]+)@/, '//***@');
}

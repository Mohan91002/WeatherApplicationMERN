import mongoose from 'mongoose';
import { Country } from '../models/Country.js';
import { countries } from '../data/countries.js';

/**
 * Standalone (re-)seed script: wipes and repopulates the `countries`
 * collection from the bundled dataset. Run with `npm run seed`.
 *
 * The server also seeds automatically on first run when the collection is
 * empty (see src/config/db.js); this script is for a forced refresh.
 */
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/weather';

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const deleted = await Country.deleteMany({});
  await Country.insertMany(countries, { ordered: true });
  console.log(`[seed] removed ${deleted.deletedCount}, inserted ${countries.length} countries.`);
} catch (err) {
  console.error(`[seed] failed: ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

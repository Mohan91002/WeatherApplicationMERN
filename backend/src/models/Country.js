import mongoose from 'mongoose';

/**
 * A world country with the representative coordinates used to fetch live
 * weather and air quality from Open-Meteo. Backed by the `countries` MongoDB
 * collection, seeded on startup from `src/data/countries.js`.
 */
const countrySchema = new mongoose.Schema(
  {
    country: { type: String, required: true },
    capital: { type: String, required: true },
    // ISO 3166-1 alpha-2 (lower-case), used for flag images. Unique key for seeding.
    code: { type: String, required: true, unique: true, index: true },
    // Flag emoji, used as a fallback when the flag image fails to load.
    flag: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    currencyCode: { type: String, default: '' },
    currencySymbol: { type: String, default: '' },
    establishedYear: { type: Number, default: 0 },
    officialLanguage: { type: String, default: '' },
  },
  {
    // The dataset order is meaningful (India-pinning etc. is done client-side,
    // but we preserve insertion order); timestamps add no value here.
    versionKey: false,
  },
);

export const Country = mongoose.model('Country', countrySchema);

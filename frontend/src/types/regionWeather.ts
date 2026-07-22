/**
 * Live weather + air quality for a country's capital.
 * Temperatures and AQI are real values sourced from the Open-Meteo APIs and
 * classified server-side (the browser holds no business logic).
 */
export interface RegionWeather {
  readonly country: string;
  readonly capital: string;
  /** ISO 3166-1 alpha-2 code (lower-case), used for flag images. */
  readonly code: string;
  /** Flag emoji, used as a fallback when the flag image fails to load. */
  readonly flag: string;
  readonly timeZone: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly temperatureC: number;
  readonly temperatureF: number;
  readonly weatherCode: number;
  readonly summary: string;
  /** US Air Quality Index (-1 when unavailable). */
  readonly aqi: number;
  /** Official US AQI category label (e.g. "Good"), classified by the backend. */
  readonly aqiCategory: string;
  /** ISO 4217 currency code (e.g. "INR"); empty when unknown. */
  readonly currencyCode: string;
  /** Currency symbol (e.g. "₹"); falls back to the code when unknown. */
  readonly currencySymbol: string;
  /** Live exchange rate: units of this currency per 1 USD (-1 when unavailable). */
  readonly currencyRate: number;
  /** Year the country/state was founded (0 when unknown). */
  readonly establishedYear: number;
  /** Official (or primary) language(s) of the country/territory. */
  readonly officialLanguage: string;
}

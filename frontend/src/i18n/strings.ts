/**
 * Central lookup for the app's English UI strings, with {param} interpolation.
 * The app is English-only (multi-language translation was removed).
 */

type Dict = Readonly<Record<string, string>>;

const EN: Dict = {
  live: 'LIVE',
  stationsReporting: '{n} stations reporting',
  boardTitle: 'World Weather',
  warmest: 'WARMEST',
  coldest: 'COLDEST',
  worstAir: 'WORST AIR',
  sort: 'SORT',
  country: 'Country',
  capital: 'Capital',
  aqi: 'AQI',
  year: 'Year',
  find: 'FIND',
  searchPlaceholder: 'Country',
  loading: 'acquiring live weather & air quality…',
  loadError: 'Unable to load live weather. Is the API running on port 5135?',
  allPlotted: 'all {n} stations plotted',
  showing: 'showing {v} / {t}',
  lang: 'LANG',
  temp: 'TEMP',
  air: 'AIR',
  fx: 'FX',
  est: 'EST.',
  noReport: 'no report',
  rateUnavailable: 'rate unavailable',
};

/** Look up a UI string by key, with optional {param} substitution. */
export function t(key: string, params?: Record<string, string | number>): string {
  let value = EN[key] ?? key;
  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      value = value.replace(`{${name}}`, String(replacement));
    }
  }
  return value;
}

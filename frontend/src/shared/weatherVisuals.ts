/**
 * Shared helpers that map weather data to visuals for the regions panel.
 * These are pure presentation helpers — the numeric classification (WMO code
 * description, AQI category) is owned by the backend.
 */

/**
 * Maps a WMO weather interpretation code (as returned by Open-Meteo) to an emoji.
 */
export function iconForWeatherCode(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

/**
 * A solid accent colour for a temperature, on a cold→hot scale drawn from the
 * instrument palette (cold cyan → mint → sand → amber → hot red).
 */
export function temperatureColor(temperatureC: number): string {
  if (temperatureC <= 0) return '#7cc9f0';
  if (temperatureC <= 12) return '#6fd0c4';
  if (temperatureC <= 24) return '#e9d98a';
  if (temperatureC <= 32) return '#f2a65a';
  return '#e8623b';
}

/**
 * Fraction of sky covered by cloud (0 = clear, 1 = overcast), derived from the
 * WMO weather code — the shaded fraction of a station-model circle.
 */
export function skyCover(code: number): number {
  if (code < 0) return 0;
  if (code === 0) return 0;
  if (code === 1) return 0.2;
  if (code === 2) return 0.55;
  if (code === 3) return 1;
  // Fog, precipitation and storms all imply a full, overcast sky.
  return 0.9;
}

/**
 * Well-known short abbreviations for common capital time zones. Zones not
 * listed here fall back to the reliable UTC offset (see {@link timeZoneLabel}).
 */
const TIME_ZONE_ABBREVIATIONS: Readonly<Record<string, string>> = {
  'Asia/Kolkata': 'IST',
  'Asia/Colombo': 'IST',
  'Asia/Dubai': 'GST',
  'Asia/Tokyo': 'JST',
  'Asia/Seoul': 'KST',
  'Asia/Shanghai': 'CST',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Singapore': 'SGT',
  'Asia/Bangkok': 'ICT',
  'Asia/Karachi': 'PKT',
  'Asia/Dhaka': 'BST',
  'Asia/Kathmandu': 'NPT',
  'Asia/Jakarta': 'WIB',
  'Asia/Manila': 'PHT',
  'Asia/Tehran': 'IRST',
  'Asia/Riyadh': 'AST',
  'Asia/Baghdad': 'AST',
  'Asia/Jerusalem': 'IST',
  'Asia/Yangon': 'MMT',
  'Asia/Kabul': 'AFT',
  'Europe/London': 'GMT',
  'Europe/Paris': 'CET',
  'Europe/Berlin': 'CET',
  'Europe/Madrid': 'CET',
  'Europe/Rome': 'CET',
  'Europe/Moscow': 'MSK',
  'Europe/Athens': 'EET',
  'Europe/Istanbul': 'TRT',
  'Europe/Lisbon': 'WET',
  'America/New_York': 'ET',
  'America/Chicago': 'CT',
  'America/Denver': 'MT',
  'America/Los_Angeles': 'PT',
  'America/Toronto': 'ET',
  'America/Mexico_City': 'CST',
  'America/Sao_Paulo': 'BRT',
  'America/Argentina/Buenos_Aires': 'ART',
  'America/Bogota': 'COT',
  'America/Lima': 'PET',
  'Africa/Cairo': 'EET',
  'Africa/Johannesburg': 'SAST',
  'Africa/Lagos': 'WAT',
  'Africa/Nairobi': 'EAT',
  'Australia/Sydney': 'AEST',
  'Australia/Canberra': 'AEST',
  'Pacific/Auckland': 'NZST',
  UTC: 'UTC',
};

/** The current UTC offset for a zone, e.g. "UTC+5:30" (reliable for every zone). */
export function utcOffset(timeZone: string, date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(date);
    const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
    return name.replace('GMT', 'UTC') === 'UTC' ? 'UTC' : name.replace('GMT', 'UTC');
  } catch {
    return 'UTC';
  }
}

/**
 * A compact time-zone label: a well-known abbreviation plus the UTC offset
 * (e.g. "IST · UTC+5:30"), or just the offset when no abbreviation is known.
 */
export function timeZoneLabel(timeZone: string, date: Date): string {
  const offset = utcOffset(timeZone, date);
  const abbreviation = TIME_ZONE_ABBREVIATIONS[timeZone];
  return abbreviation ? `${abbreviation} · ${offset}` : offset;
}

/**
 * Display colour for a US AQI value, on the official EPA scale. Keyed on the
 * numeric value (not the category text) so it stays correct regardless of the
 * language the category label is shown in.
 */
export function aqiColor(aqi: number): string {
  if (aqi < 0) return '#9ca3af';
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#7f1d1d';
}

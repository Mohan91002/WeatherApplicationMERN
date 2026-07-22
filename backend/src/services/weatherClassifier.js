/**
 * Pure, side-effect-free classification of raw weather numbers into the domain
 * values the UI displays: a WMO weather-code description, a US AQI category and
 * the Fahrenheit conversion. Presentation (gradients, icons, colours) stays in
 * the frontend; this is the data layer that owns the categorisation.
 */

/** WMO weather interpretation code -> short human-readable description. */
const WEATHER_CODE_DESCRIPTIONS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Rain',
  63: 'Rain',
  65: 'Rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Snow',
  73: 'Snow',
  75: 'Snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Rain showers',
  85: 'Snow showers',
  86: 'Snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with hail',
};

/**
 * Maps a WMO weather interpretation code (as returned by Open-Meteo) to a
 * short human-readable description.
 * @param {number} code
 * @returns {string}
 */
export function describeWeatherCode(code) {
  return WEATHER_CODE_DESCRIPTIONS[code] ?? 'Unavailable';
}

/**
 * Maps a US Air Quality Index value to its official category label.
 * Negative values represent an unavailable reading.
 * @param {number} aqi
 * @returns {string}
 */
export function aqiCategory(aqi) {
  if (aqi < 0) return 'N/A';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy (sensitive)';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

/**
 * Converts a Celsius temperature to whole-degree Fahrenheit.
 * @param {number} celsius
 * @returns {number}
 */
export function toFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

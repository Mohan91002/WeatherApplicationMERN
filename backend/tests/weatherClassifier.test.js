import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeWeatherCode, aqiCategory, toFahrenheit } from '../src/services/weatherClassifier.js';

test('describeWeatherCode maps known and unknown codes', () => {
  const cases = [
    [0, 'Clear sky'],
    [2, 'Partly cloudy'],
    [3, 'Overcast'],
    [61, 'Rain'],
    [75, 'Snow'],
    [95, 'Thunderstorm'],
    [99, 'Thunderstorm with hail'],
    [-1, 'Unavailable'], // placeholder / no reading
    [4242, 'Unavailable'], // unknown code
  ];
  for (const [code, expected] of cases) {
    assert.equal(describeWeatherCode(code), expected, `code ${code}`);
  }
});

test('aqiCategory maps EPA bands at boundaries', () => {
  const cases = [
    [-1, 'N/A'],
    [0, 'Good'],
    [50, 'Good'],
    [51, 'Moderate'],
    [100, 'Moderate'],
    [101, 'Unhealthy (sensitive)'],
    [150, 'Unhealthy (sensitive)'],
    [151, 'Unhealthy'],
    [200, 'Unhealthy'],
    [201, 'Very unhealthy'],
    [300, 'Very unhealthy'],
    [301, 'Hazardous'],
    [999, 'Hazardous'],
  ];
  for (const [aqi, expected] of cases) {
    assert.equal(aqiCategory(aqi), expected, `aqi ${aqi}`);
  }
});

test('toFahrenheit converts and rounds', () => {
  const cases = [
    [0, 32],
    [100, 212],
    [-40, -40],
    [31, 88], // 87.8 -> 88
    [-4, 25], // 24.8 -> 25
    [37, 99], // 98.6 -> 99
  ];
  for (const [celsius, expected] of cases) {
    assert.equal(toFahrenheit(celsius), expected, `${celsius}C`);
  }
});

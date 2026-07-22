import { describe, it, expect } from 'vitest';
import { aqiColor, iconForWeatherCode, skyCover, temperatureColor, timeZoneLabel } from './weatherVisuals';

describe('weatherVisuals (pure UI helpers)', () => {
  describe('temperatureColor', () => {
    it('scales cold → hot across the palette', () => {
      expect(temperatureColor(-5)).toBe('#7cc9f0'); // freezing
      expect(temperatureColor(10)).toBe('#6fd0c4'); // cool
      expect(temperatureColor(20)).toBe('#e9d98a'); // mild
      expect(temperatureColor(30)).toBe('#f2a65a'); // warm
      expect(temperatureColor(45)).toBe('#e8623b'); // hot
    });

    it('uses inclusive upper bounds', () => {
      expect(temperatureColor(0)).toBe('#7cc9f0');
      expect(temperatureColor(12)).toBe('#6fd0c4');
      expect(temperatureColor(24)).toBe('#e9d98a');
      expect(temperatureColor(32)).toBe('#f2a65a');
    });
  });

  describe('skyCover', () => {
    it('maps a WMO code to a 0..1 cloud fraction', () => {
      expect(skyCover(-1)).toBe(0); // no reading
      expect(skyCover(0)).toBe(0); // clear
      expect(skyCover(1)).toBe(0.2);
      expect(skyCover(2)).toBe(0.55);
      expect(skyCover(3)).toBe(1); // overcast
      expect(skyCover(61)).toBe(0.9); // rain -> overcast-ish
      expect(skyCover(95)).toBe(0.9); // storm
    });
  });

  describe('aqiColor', () => {
    it('maps a numeric AQI to its EPA colour', () => {
      expect(aqiColor(-1)).toBe('#9ca3af'); // unavailable
      expect(aqiColor(30)).toBe('#22c55e'); // good
      expect(aqiColor(80)).toBe('#eab308'); // moderate
      expect(aqiColor(175)).toBe('#ef4444'); // unhealthy
      expect(aqiColor(380)).toBe('#7f1d1d'); // hazardous
    });
  });

  describe('iconForWeatherCode', () => {
    it('picks an emoji per condition band', () => {
      expect(iconForWeatherCode(0)).toBe('☀️');
      expect(iconForWeatherCode(2)).toBe('⛅');
      expect(iconForWeatherCode(65)).toBe('🌧️');
      expect(iconForWeatherCode(95)).toBe('⛈️');
    });
  });

  describe('timeZoneLabel', () => {
    const noon = new Date('2026-07-20T12:00:00Z');

    it('shows a known abbreviation with the UTC offset', () => {
      const label = timeZoneLabel('Asia/Kolkata', noon);
      expect(label).toContain('IST');
      expect(label).toContain('UTC+5:30');
    });

    it('falls back to just the UTC offset for an unmapped zone', () => {
      const label = timeZoneLabel('Asia/Bishkek', noon);
      expect(label).toContain('UTC');
      expect(label).not.toContain('·'); // no abbreviation part
    });
  });
});

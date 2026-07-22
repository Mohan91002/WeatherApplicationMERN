import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countries } from '../src/data/countries.js';

test('contains the full country set', () => {
  // 245 countries/territories + India's 8 union territories.
  assert.equal(countries.length, 253);
});

test('every code is a lowercase alpha-2 or subdivision', () => {
  const re = /^[a-z]{2}(-[a-z]{2})?$/;
  for (const c of countries) {
    assert.match(c.code, re, `code ${c.code}`);
  }
});

test('codes are unique', () => {
  assert.equal(new Set(countries.map((c) => c.code)).size, countries.length);
});

test('every country has a currency code', () => {
  for (const c of countries) {
    assert.ok(c.currencyCode && c.currencyCode.trim().length > 0, `${c.country} currency`);
  }
});

test('every country has an official language', () => {
  for (const c of countries) {
    assert.ok(c.officialLanguage && c.officialLanguage.trim().length > 0, `${c.country} language`);
  }
});

test('coordinates are within valid ranges', () => {
  for (const c of countries) {
    assert.ok(c.latitude >= -90 && c.latitude <= 90, `${c.country} lat`);
    assert.ok(c.longitude >= -180 && c.longitude <= 180, `${c.country} lon`);
  }
});

test('established year is zero or a plausible year', () => {
  for (const c of countries) {
    assert.ok(c.establishedYear === 0 || (c.establishedYear > 0 && c.establishedYear <= 2100), `${c.country} year`);
  }
});

test('India has expected details', () => {
  const india = countries.find((c) => c.country === 'India');
  assert.ok(india);
  assert.equal(india.capital, 'New Delhi');
  assert.equal(india.code, 'in');
  assert.equal(india.currencyCode, 'INR');
  assert.equal(india.currencySymbol, '₹');
  assert.equal(india.establishedYear, 1947);
  assert.equal(india.officialLanguage, 'Hindi, English');
});

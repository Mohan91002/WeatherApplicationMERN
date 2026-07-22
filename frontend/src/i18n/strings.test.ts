import { describe, it, expect } from 'vitest';
import { t } from './strings';

describe('i18n strings', () => {
  it('returns the English string for a key', () => {
    expect(t('boardTitle')).toBe('World Weather');
    expect(t('aqi')).toBe('AQI');
  });

  it('interpolates parameters', () => {
    expect(t('stationsReporting', { n: 253 })).toBe('253 stations reporting');
  });

  it('falls back to the key for a missing string', () => {
    expect(t('this-key-does-not-exist')).toBe('this-key-does-not-exist');
  });
});

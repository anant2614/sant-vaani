import { describe, expect, it } from 'vitest';
import {
  CITIES,
  chandni,
  defaultCityFor,
  gangaGhat,
  resolveScheme,
  sunTimes,
  type City,
} from '../src/index.ts';

const delhi = CITIES.find((c) => c.id === 'delhi') as City;
const tromso: City = { id: 'tromso', name: 'Tromsø', lat: 69.6492, lon: 18.9553, timeZone: 'Europe/Oslo' };

describe('tokens', () => {
  it('both palettes define the same 14 colours', () => {
    const keys = Object.keys(gangaGhat).sort();
    expect(keys).toHaveLength(14);
    expect(Object.keys(chandni).sort()).toEqual(keys);
    for (const value of [...Object.values(gangaGhat), ...Object.values(chandni)]) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('keeps the chosen Ganga Ghat and Chandni values', () => {
    expect(gangaGhat.bg).toBe('#E9EFF2');
    expect(gangaGhat.accent).toBe('#E39A2E');
    expect(chandni.bg).toBe('#1C2230');
    expect(chandni.accent).toBe('#E9D9A6');
  });
});

describe('sunTimes', () => {
  it('New Delhi on 2026-06-21 sets between 13:45 and 14:00 UTC', () => {
    const { sunset, sunrise, polar } = sunTimes(new Date('2026-06-21T06:00:00Z'), delhi.lat, delhi.lon);
    expect(polar).toBeNull();
    expect(sunset!.toISOString() > '2026-06-21T13:45:00').toBe(true);
    expect(sunset!.toISOString() < '2026-06-21T14:00:00').toBe(true);
    // Sunrise in Delhi on the solstice is about 05:24 IST, which is 23:54 UTC the day before.
    expect(sunrise!.toISOString() > '2026-06-20T23:45:00').toBe(true);
    expect(sunrise!.toISOString() < '2026-06-21T00:05:00').toBe(true);
  });

  it('reports polar day in Tromsø at midsummer', () => {
    expect(sunTimes(new Date('2026-06-21T12:00:00Z'), tromso.lat, tromso.lon).polar).toBe('day');
  });

  it('reports polar night in Tromsø at midwinter', () => {
    expect(sunTimes(new Date('2026-12-21T12:00:00Z'), tromso.lat, tromso.lon).polar).toBe('night');
  });
});

describe('resolveScheme', () => {
  it('switches exactly at sunset', () => {
    const { sunset } = sunTimes(new Date('2026-06-21T06:00:00Z'), delhi.lat, delhi.lon);
    const before = new Date(sunset!.getTime() - 1);
    expect(resolveScheme('sun', before, delhi, null)).toBe('light');
    expect(resolveScheme('sun', sunset!, delhi, null)).toBe('dark');
  });

  it('is dark before sunrise and light after it', () => {
    const { sunrise } = sunTimes(new Date('2026-06-21T06:00:00Z'), delhi.lat, delhi.lon);
    expect(resolveScheme('sun', new Date(sunrise!.getTime() - 60_000), delhi, null)).toBe('dark');
    expect(resolveScheme('sun', new Date(sunrise!.getTime() + 60_000), delhi, null)).toBe('light');
  });

  it('polar day stays light', () => {
    // 00:30 in Tromsø, when the midnight sun is up.
    expect(resolveScheme('sun', new Date('2026-06-21T22:30:00Z'), tromso, null)).toBe('light');
  });

  it('polar night stays dark at noon', () => {
    expect(resolveScheme('sun', new Date('2026-12-21T11:00:00Z'), tromso, null)).toBe('dark');
  });

  it('follows the phone when asked, and falls back to the sun without a system value', () => {
    const noon = new Date('2026-06-21T06:30:00Z');
    expect(resolveScheme('system', noon, delhi, 'dark')).toBe('dark');
    expect(resolveScheme('system', noon, delhi, 'light')).toBe('light');
    expect(resolveScheme('system', noon, delhi, null)).toBe('light');
  });

  it('honours a fixed choice', () => {
    const midnight = new Date('2026-06-21T18:30:00Z');
    expect(resolveScheme('light', midnight, delhi, 'dark')).toBe('light');
    expect(resolveScheme('dark', midnight, delhi, 'light')).toBe('dark');
  });

  it('uses New Delhi when no city is set', () => {
    expect(resolveScheme('sun', new Date('2026-06-21T18:30:00Z'), null, null)).toBe('dark');
  });
});

describe('cities', () => {
  it('maps time zones to a sensible default city', () => {
    expect(defaultCityFor('Asia/Kolkata').id).toBe('delhi');
    expect(defaultCityFor('Asia/Calcutta').id).toBe('delhi');
    expect(defaultCityFor('Europe/London').id).toBe('london');
    expect(defaultCityFor('America/Los_Angeles').id).toBe('san-francisco');
    expect(defaultCityFor('Mars/Olympus').id).toBe('delhi');
  });

  it('has unique ids and valid coordinates', () => {
    const ids = new Set(CITIES.map((c) => c.id));
    expect(ids.size).toBe(CITIES.length);
    for (const c of CITIES) {
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
    }
  });
});

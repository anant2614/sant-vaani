/**
 * Sunrise and sunset from the standard solar position formulas used by
 * NOAA's calculator, accurate to about a minute, which is all the theme
 * switch needs.
 */

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const OBLIQUITY = RAD * 23.4397;
const J0 = 0.0009;
/** The sun's upper limb touching the horizon, with refraction. */
const SUNRISE_ALTITUDE = -0.833 * RAD;

const toJulian = (date: Date) => date.valueOf() / DAY_MS - 0.5 + J1970;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * DAY_MS);
const toDays = (date: Date) => toJulian(date) - J2000;

const declination = (eclipticLongitude: number) =>
  Math.asin(Math.sin(eclipticLongitude) * Math.sin(OBLIQUITY));

const solarMeanAnomaly = (d: number) => RAD * (357.5291 + 0.98560028 * d);

const eclipticLongitude = (m: number) => {
  const centre = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
  const perihelion = RAD * 102.9372;
  return m + centre + perihelion + Math.PI;
};

const julianCycle = (d: number, lw: number) => Math.round(d - J0 - lw / (2 * Math.PI));
const approxTransit = (ht: number, lw: number, n: number) => J0 + (ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds: number, m: number, l: number) =>
  J2000 + ds + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * l);

export type SunTimes = {
  sunrise: Date | null;
  sunset: Date | null;
  /** Set when the sun never rises ('night') or never sets ('day') on this date. */
  polar: 'day' | 'night' | null;
};

/**
 * Sunrise and sunset for the solar day containing `date` at the given place.
 * The solar day runs from local solar midnight to the next, so a time just
 * after midnight and a time just before it both belong to the day between.
 */
export function sunTimes(date: Date, lat: number, lon: number): SunTimes {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const m = solarMeanAnomaly(ds);
  const l = eclipticLongitude(m);
  const dec = declination(l);
  const noon = solarTransitJ(ds, m, l);

  const cosH =
    (Math.sin(SUNRISE_ALTITUDE) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosH < -1) return { sunrise: null, sunset: null, polar: 'day' };
  if (cosH > 1) return { sunrise: null, sunset: null, polar: 'night' };

  const w = Math.acos(cosH);
  const set = solarTransitJ(approxTransit(w, lw, n), m, l);
  const rise = noon - (set - noon);
  return { sunrise: fromJulian(rise), sunset: fromJulian(set), polar: null };
}

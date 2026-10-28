// Copied from packages/core/src by scripts/sync-core.mjs. Edit the original and run npm run sync:core.
export type City = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  timeZone: string;
};

/**
 * Cities offered for "switch at sunset". India first, then the places most
 * of the diaspora lives. People pick one in Settings; nobody is asked for
 * their location.
 */
export const CITIES: City[] = [
  { id: 'delhi', name: 'New Delhi', lat: 28.6139, lon: 77.209, timeZone: 'Asia/Kolkata' },
  { id: 'mumbai', name: 'Mumbai', lat: 19.076, lon: 72.8777, timeZone: 'Asia/Kolkata' },
  { id: 'bengaluru', name: 'Bengaluru', lat: 12.9716, lon: 77.5946, timeZone: 'Asia/Kolkata' },
  { id: 'kolkata', name: 'Kolkata', lat: 22.5726, lon: 88.3639, timeZone: 'Asia/Kolkata' },
  { id: 'chennai', name: 'Chennai', lat: 13.0827, lon: 80.2707, timeZone: 'Asia/Kolkata' },
  { id: 'hyderabad', name: 'Hyderabad', lat: 17.385, lon: 78.4867, timeZone: 'Asia/Kolkata' },
  { id: 'pune', name: 'Pune', lat: 18.5204, lon: 73.8567, timeZone: 'Asia/Kolkata' },
  { id: 'ahmedabad', name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, timeZone: 'Asia/Kolkata' },
  { id: 'jaipur', name: 'Jaipur', lat: 26.9124, lon: 75.7873, timeZone: 'Asia/Kolkata' },
  { id: 'lucknow', name: 'Lucknow', lat: 26.8467, lon: 80.9462, timeZone: 'Asia/Kolkata' },
  { id: 'varanasi', name: 'Varanasi', lat: 25.3176, lon: 82.9739, timeZone: 'Asia/Kolkata' },
  { id: 'vrindavan', name: 'Vrindavan', lat: 27.5806, lon: 77.7006, timeZone: 'Asia/Kolkata' },
  { id: 'rishikesh', name: 'Rishikesh', lat: 30.0869, lon: 78.2676, timeZone: 'Asia/Kolkata' },
  { id: 'ayodhya', name: 'Ayodhya', lat: 26.7922, lon: 82.1998, timeZone: 'Asia/Kolkata' },
  { id: 'patna', name: 'Patna', lat: 25.5941, lon: 85.1376, timeZone: 'Asia/Kolkata' },
  { id: 'bhopal', name: 'Bhopal', lat: 23.2599, lon: 77.4126, timeZone: 'Asia/Kolkata' },
  { id: 'indore', name: 'Indore', lat: 22.7196, lon: 75.8577, timeZone: 'Asia/Kolkata' },
  { id: 'chandigarh', name: 'Chandigarh', lat: 30.7333, lon: 76.7794, timeZone: 'Asia/Kolkata' },
  { id: 'guwahati', name: 'Guwahati', lat: 26.1445, lon: 91.7362, timeZone: 'Asia/Kolkata' },
  { id: 'bhubaneswar', name: 'Bhubaneswar', lat: 20.2961, lon: 85.8245, timeZone: 'Asia/Kolkata' },
  { id: 'kochi', name: 'Kochi', lat: 9.9312, lon: 76.2673, timeZone: 'Asia/Kolkata' },
  { id: 'nagpur', name: 'Nagpur', lat: 21.1458, lon: 79.0882, timeZone: 'Asia/Kolkata' },
  { id: 'kathmandu', name: 'Kathmandu', lat: 27.7172, lon: 85.324, timeZone: 'Asia/Kathmandu' },
  { id: 'dubai', name: 'Dubai', lat: 25.2048, lon: 55.2708, timeZone: 'Asia/Dubai' },
  { id: 'singapore', name: 'Singapore', lat: 1.3521, lon: 103.8198, timeZone: 'Asia/Singapore' },
  { id: 'london', name: 'London', lat: 51.5072, lon: -0.1276, timeZone: 'Europe/London' },
  { id: 'new-york', name: 'New York', lat: 40.7128, lon: -74.006, timeZone: 'America/New_York' },
  { id: 'chicago', name: 'Chicago', lat: 41.8781, lon: -87.6298, timeZone: 'America/Chicago' },
  { id: 'san-francisco', name: 'San Francisco', lat: 37.7749, lon: -122.4194, timeZone: 'America/Los_Angeles' },
  { id: 'toronto', name: 'Toronto', lat: 43.6532, lon: -79.3832, timeZone: 'America/Toronto' },
  { id: 'sydney', name: 'Sydney', lat: -33.8688, lon: 151.2093, timeZone: 'Australia/Sydney' },
  { id: 'melbourne', name: 'Melbourne', lat: -37.8136, lon: 144.9631, timeZone: 'Australia/Melbourne' },
  { id: 'auckland', name: 'Auckland', lat: -36.8485, lon: 174.7633, timeZone: 'Pacific/Auckland' },
];

const ZONE_ALIASES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'US/Eastern': 'America/New_York',
  'US/Pacific': 'America/Los_Angeles',
  'US/Central': 'America/Chicago',
};

const DEFAULT_CITY = CITIES[0] as City;

export function cityById(id: string | null | undefined): City | null {
  return CITIES.find((c) => c.id === id) ?? null;
}

/** A reasonable first guess from the phone's time zone; New Delhi otherwise. */
export function defaultCityFor(timeZone: string): City {
  const zone = ZONE_ALIASES[timeZone] ?? timeZone;
  return CITIES.find((c) => c.timeZone === zone) ?? DEFAULT_CITY;
}

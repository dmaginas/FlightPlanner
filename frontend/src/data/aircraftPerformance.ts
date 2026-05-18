export const DEFAULT_AIRCRAFT_TYPE = 'B738'

export const AIRCRAFT_MANUFACTURERS = {
  AIRBUS: 'Airbus',
  BOEING: 'Boeing',
  EMBRAER: 'Embraer',
}

const APPROXIMATE = true // Approximated optimistic defaults; replace with verified data later.

const AIRCRAFT_RAW = [
  ['A19N','Airbus A319neo','Airbus',470,3750,39000,2.35],['A20N','Airbus A320neo','Airbus',470,3900,39000,2.45],['A21N','Airbus A321neo','Airbus',470,4000,39000,2.6],['A318','Airbus A318','Airbus',447,3100,37000,2.25],['A319','Airbus A319','Airbus',447,3600,37000,2.4],['A320','Airbus A320','Airbus',447,3300,37000,2.5],['A321','Airbus A321','Airbus',447,3500,37000,2.7],['A332','Airbus A330-200','Airbus',470,7250,41000,5.8],['A333','Airbus A330-300','Airbus',470,6350,41000,6.2],['A343','Airbus A340-300','Airbus',470,7300,41000,6.7],['A359','Airbus A350-900','Airbus',488,8100,43000,5.9],['A388','Airbus A380-800','Airbus',488,8200,43000,10.8],
  ['B37M','Boeing 737 MAX 7','Boeing',453,3850,41000,2.2],['B38M','Boeing 737 MAX 8','Boeing',453,3950,41000,2.35],['B39M','Boeing 737 MAX 9','Boeing',453,3600,41000,2.55],['B3XM','Boeing 737 MAX 10','Boeing',453,3500,41000,2.65],['B734','Boeing 737-400','Boeing',430,2000,37000,2.55],['B737','Boeing 737-700','Boeing',447,3200,41000,2.3],['B738','Boeing 737-800','Boeing',447,3200,41000,2.5],['B739','Boeing 737-900','Boeing',447,3200,41000,2.65],['B744','Boeing 747-400','Boeing',493,7300,43000,10.6],['B748','Boeing 747-8','Boeing',493,7700,43000,10.0],['B752','Boeing 757-200','Boeing',460,3900,42000,3.2],['B763','Boeing 767-300','Boeing',459,5900,43000,5.7],['B772','Boeing 777-200','Boeing',488,7000,43000,7.1],['B773','Boeing 777-300','Boeing',488,6500,43000,7.8],['B77W','Boeing 777-300ER','Boeing',488,7400,43000,7.4],['B788','Boeing 787-8','Boeing',488,7350,43000,5.2],['B789','Boeing 787-9','Boeing',488,7600,43000,5.5],
  ['E145','Embraer ERJ-145','Embraer',430,1800,37000,1.35],['E170','Embraer E170','Embraer',447,2100,39000,1.65],['E190','Embraer E190','Embraer',447,2500,41000,1.9],['E195','Embraer E195','Embraer',447,2600,41000,2.0],['E75L','Embraer E175','Embraer',447,2200,41000,1.75],
]

export const AIRCRAFT_PERFORMANCE_PROFILES = AIRCRAFT_RAW.map(([icaoCode, displayName, manufacturer, cruiseSpeedKts, maxRangeNm, preferredCruiseAltitudeFt, fuelBurnTonPerHour]) => ({
  icaoCode, displayName, manufacturer, cruiseSpeedKts, maxRangeNm, preferredCruiseAltitudeFt, fuelBurnTonPerHour,
  climbRateFpm: 1800, descentRateFpm: 2200, isApproximate: APPROXIMATE,
})).sort((a, b) => a.icaoCode.localeCompare(b.icaoCode))

export const AIRCRAFT_PROFILE_BY_ICAO = Object.fromEntries(AIRCRAFT_PERFORMANCE_PROFILES.map((p) => [p.icaoCode, p]))

export function getAircraftDisplayLabel(profile) { return `${profile.icaoCode} — ${profile.displayName}` }
export function filterAircraftProfiles(query) {
  const q = query.trim().toLowerCase()
  if (!q) return AIRCRAFT_PERFORMANCE_PROFILES
  return AIRCRAFT_PERFORMANCE_PROFILES.filter((p) => [p.icaoCode, p.displayName, p.manufacturer].join(' ').toLowerCase().includes(q))
}

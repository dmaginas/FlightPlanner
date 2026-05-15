export const airports = [
  { icao: 'EDDF', iata: 'FRA', name: 'Frankfurt am Main', city: 'Frankfurt', country: 'Germany',         lat: 50.0379,  lon:  8.5622,  elevation:  364 },
  { icao: 'EGLL', iata: 'LHR', name: 'London Heathrow',   city: 'London',    country: 'United Kingdom', lat: 51.4775,  lon: -0.4614,  elevation:   83 },
  { icao: 'EDDM', iata: 'MUC', name: 'Munich Airport',    city: 'Munich',    country: 'Germany',         lat: 48.3537,  lon: 11.7750,  elevation: 1487 },
  { icao: 'LFPG', iata: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'France',       lat: 49.0097,  lon:  2.5479,  elevation:  392 },
  { icao: 'EHAM', iata: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Netherlands',   lat: 52.3086,  lon:  4.7639,  elevation:  -11 },
  { icao: 'LEMD', iata: 'MAD', name: 'Madrid Barajas',    city: 'Madrid',    country: 'Spain',           lat: 40.4936,  lon: -3.5673,  elevation: 2004 },
  { icao: 'LIRF', iata: 'FCO', name: 'Rome Fiumicino',    city: 'Rome',      country: 'Italy',           lat: 41.8003,  lon: 12.2389,  elevation:   14 },
  { icao: 'KJFK', iata: 'JFK', name: 'New York JFK',      city: 'New York',  country: 'United States',   lat: 40.6413,  lon:-73.7781,  elevation:   13 },
  { icao: 'LSZH', iata: 'ZRH', name: 'Zurich Airport',    city: 'Zurich',    country: 'Switzerland',     lat: 47.4647,  lon:  8.5492,  elevation: 1416 },
  { icao: 'LOWW', iata: 'VIE', name: 'Vienna Schwechat',  city: 'Vienna',    country: 'Austria',         lat: 48.1103,  lon: 16.5697,  elevation:  600 },
  { icao: 'ENGM', iata: 'OSL', name: 'Oslo Gardermoen',   city: 'Oslo',      country: 'Norway',          lat: 60.1939,  lon: 11.1004,  elevation: 1696 },
  { icao: 'ESSA', iata: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'Sweden',          lat: 59.6519,  lon: 17.9186,  elevation:  137 },
];

export function searchAirports(query) {
  if (!query || query.length < 2) return [];
  const q = query.toUpperCase().trim();
  return airports
    .filter(a =>
      a.icao.startsWith(q) ||
      a.iata.startsWith(q) ||
      a.name.toUpperCase().includes(q) ||
      a.city.toUpperCase().includes(q)
    )
    .slice(0, 6);
}

export function getAirport(icao) {
  return airports.find(a => a.icao === icao?.toUpperCase()) ?? null;
}

export function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // Earth radius in NM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

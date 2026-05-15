import { haversineNm } from './airports.ts';

// ─── Pre-defined routes ───────────────────────────────────────────────────────

const ROUTES = {
  'EDDF-EGLL': {
    airway: 'ANEKI1G UL9 KONAN UT420 SILVA1F',
    altitude: 'FL350',
    aircraft: 'A320',
    waypoints: [
      { id: 'EDDF',  type: 'airport', lat: 50.0379, lon:  8.5622 },
      { id: 'ANEKI', type: 'fix',     lat: 50.112,  lon:  8.020,  airway: 'ANEKI1G' },
      { id: 'KOSAX', type: 'fix',     lat: 50.456,  lon:  5.891,  airway: 'UL9' },
      { id: 'TIGER', type: 'fix',     lat: 51.023,  lon:  3.445,  airway: 'UL9' },
      { id: 'KONAN', type: 'fix',     lat: 51.275,  lon:  1.554,  airway: 'UT420' },
      { id: 'SILVA', type: 'fix',     lat: 51.408,  lon:  0.152,  airway: 'SILVA1F' },
      { id: 'EGLL',  type: 'airport', lat: 51.4775, lon: -0.4614 },
    ],
  },
  'EDDF-EDDM': {
    airway: 'Z74 AMTIX T161',
    altitude: 'FL240',
    aircraft: 'A320',
    waypoints: [
      { id: 'EDDF',  type: 'airport', lat: 50.0379, lon:  8.5622 },
      { id: 'AMTIX', type: 'fix',     lat: 49.534,  lon:  9.876,  airway: 'Z74' },
      { id: 'NAPSA', type: 'fix',     lat: 49.012,  lon: 10.987,  airway: 'T161' },
      { id: 'EDDM',  type: 'airport', lat: 48.3537, lon: 11.7750 },
    ],
  },
  'EDDF-LFPG': {
    airway: 'MARUN1G UN851 BANKO DCT',
    altitude: 'FL310',
    aircraft: 'A320',
    waypoints: [
      { id: 'EDDF',  type: 'airport', lat: 50.0379, lon:  8.5622 },
      { id: 'MARUN', type: 'fix',     lat: 50.023,  lon:  8.112,  airway: 'MARUN1G' },
      { id: 'BANKO', type: 'fix',     lat: 49.712,  lon:  6.234,  airway: 'UN851' },
      { id: 'MOBLO', type: 'fix',     lat: 49.345,  lon:  4.108,  airway: 'UN851' },
      { id: 'LFPG',  type: 'airport', lat: 49.0097, lon:  2.5479 },
    ],
  },
  'EDDF-EHAM': {
    airway: 'BIBAK2G UL620 HELEN DCT',
    altitude: 'FL270',
    aircraft: 'A320',
    waypoints: [
      { id: 'EDDF',  type: 'airport', lat: 50.0379, lon:  8.5622 },
      { id: 'BIBAK', type: 'fix',     lat: 50.089,  lon:  7.985,  airway: 'BIBAK2G' },
      { id: 'HELEN', type: 'fix',     lat: 51.112,  lon:  6.445,  airway: 'UL620' },
      { id: 'EHAM',  type: 'airport', lat: 52.3086, lon:  4.7639 },
    ],
  },
};

function enrichWaypoints(waypoints) {
  let cumDist = 0;
  return waypoints.map((wp, i) => {
    if (i > 0) {
      const prev = waypoints[i - 1];
      cumDist += haversineNm(prev.lat, prev.lon, wp.lat, wp.lon);
    }
    const altLabel =
      wp.type === 'airport' ? 'GND' :
      i === 1               ? 'CLB' :
      i === waypoints.length - 2 ? 'DSC' : 'CRZ';
    return { ...wp, distCum: Math.round(cumDist), altLabel };
  });
}

export function getRoute(depIcao, arrIcao) {
  const key    = `${depIcao}-${arrIcao}`;
  const revKey = `${arrIcao}-${depIcao}`;

  if (ROUTES[key]) {
    const r = ROUTES[key];
    return { ...r, waypoints: enrichWaypoints(r.waypoints) };
  }
  if (ROUTES[revKey]) {
    const r   = ROUTES[revKey];
    const wps = [...r.waypoints].reverse();
    return { ...r, waypoints: enrichWaypoints(wps) };
  }
  return null; // caller generates dynamic route
}

export function generateDynamicRoute(dep, arr) {
  const total = Math.round(haversineNm(dep.lat, dep.lon, arr.lat, arr.lon));
  const n = total > 800 ? 5 : total > 400 ? 4 : 3;
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const rndName = () => Array.from({ length: 5 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const airways = ['UL9', 'UN851', 'UT420', 'UL620', 'L602', 'Z74', 'T161'];
  const rndAwy  = () => airways[Math.floor(Math.random() * airways.length)];

  const waypoints = [{ id: dep.icao, type: 'airport', lat: dep.lat, lon: dep.lon }];
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    waypoints.push({
      id:     rndName(),
      type:   'fix',
      lat:    dep.lat + (arr.lat - dep.lat) * t + (Math.random() - .5) * .8,
      lon:    dep.lon + (arr.lon - dep.lon) * t + (Math.random() - .5) * .8,
      airway: rndAwy(),
    });
  }
  waypoints.push({ id: arr.icao, type: 'airport', lat: arr.lat, lon: arr.lon });

  const alt = total > 1200 ? 'FL380' : total > 600 ? 'FL350' : total > 300 ? 'FL310' : 'FL240';
  return { airway: 'DCT', altitude: alt, aircraft: 'A320', waypoints: enrichWaypoints(waypoints) };
}

// ─── Weather mock data ────────────────────────────────────────────────────────

const WEATHER = {
  EDDF: { metar: 'EDDF 151020Z 27010KT 9999 FEW025 SCT080 12/06 Q1022', conditions: 'Few Clouds',    wind: { dir: 270, spd: 10, gust: null }, vis: 9999, temp: 12, dew:  6, qnh: 1022, ceiling: 2500, cat: 'VFR'  },
  EGLL: { metar: 'EGLL 151020Z 24018G26KT 8000 BKN015 OVC030 09/06 Q1018', conditions: 'Broken Clouds', wind: { dir: 240, spd: 18, gust: 26 },  vis: 8000, temp:  9, dew:  6, qnh: 1018, ceiling: 1500, cat: 'MVFR' },
  EDDM: { metar: 'EDDM 151020Z 03005KT 9999 SKC 08/01 Q1025', conditions: 'Clear',         wind: { dir:  30, spd:  5, gust: null }, vis: 9999, temp:  8, dew:  1, qnh: 1025, ceiling: null, cat: 'VFR'  },
  LFPG: { metar: 'LFPG 151020Z 24012KT 6000 BKN008 11/09 Q1016', conditions: 'Broken Low',   wind: { dir: 240, spd: 12, gust: null }, vis: 6000, temp: 11, dew:  9, qnh: 1016, ceiling:  800, cat: 'IFR'  },
  EHAM: { metar: 'EHAM 151020Z 23015KT 7000 SCT010 BKN025 10/08 Q1019', conditions: 'Scattered',    wind: { dir: 230, spd: 15, gust: null }, vis: 7000, temp: 10, dew:  8, qnh: 1019, ceiling: 1000, cat: 'MVFR' },
  LEMD: { metar: 'LEMD 151020Z 35003KT 9999 SKC 22/04 Q1024', conditions: 'Clear',         wind: { dir: 350, spd:  3, gust: null }, vis: 9999, temp: 22, dew:  4, qnh: 1024, ceiling: null, cat: 'VFR'  },
  LIRF: { metar: 'LIRF 151020Z 05008KT 9999 FEW040 18/08 Q1020', conditions: 'Few Clouds',    wind: { dir:  50, spd:  8, gust: null }, vis: 9999, temp: 18, dew:  8, qnh: 1020, ceiling: 4000, cat: 'VFR'  },
  KJFK: { metar: 'KJFK 151020Z 31012KT 9999 SCT045 14/02 A2991', conditions: 'Scattered',    wind: { dir: 310, spd: 12, gust: null }, vis: 9999, temp: 14, dew:  2, qnh: 1013, ceiling: 4500, cat: 'VFR'  },
};

const DEFAULT_WX = { metar: 'ZZZZ 151020Z 00000KT 9999 SKC 15/05 Q1020', conditions: 'Clear', wind: { dir: 0, spd: 0, gust: null }, vis: 9999, temp: 15, dew: 5, qnh: 1020, ceiling: null, cat: 'VFR' };

export function getWeather(icao) {
  return WEATHER[icao] ?? { ...DEFAULT_WX, metar: `${icao} 151020Z 00000KT 9999 SKC 15/05 Q1020` };
}

// ─── SIDs ─────────────────────────────────────────────────────────────────────


function createFallbackSIDs(icao, weather) {
  const wind = weather?.wind?.dir ?? 0;
  const runwayPref = wind >= 180 ? '27' : '09';
  const suffixes = ['A', 'B'];
  return suffixes.map((suffix, idx) => ({
    id: `${icao}-GEN-SID-${idx + 1}`,
    name: `${icao.slice(-2)}EXI ${idx + 1}${suffix}`,
    runway: `${runwayPref}${idx === 0 ? 'L' : 'R'}`,
    initialAlt: idx === 0 ? 'FL070' : 'FL090',
    confidence: idx === 0 ? 78 : 69,
    windScore: idx === 0 ? 'Favorable' : 'Crosswind',
    note: 'Fallback procedure generated from current route and wind data.',
    path: [],
  }));
}

function createFallbackSTARs(icao, weather) {
  const wind = weather?.wind?.dir ?? 0;
  const runwayPref = wind >= 180 ? '27' : '09';
  const suffixes = ['A', 'B'];
  return suffixes.map((suffix, idx) => ({
    id: `${icao}-GEN-STAR-${idx + 1}`,
    name: `${icao.slice(-2)}ARR ${idx + 1}${suffix}`,
    runway: `${runwayPref}${idx === 0 ? 'L' : 'R'}`,
    finalAlt: idx === 0 ? '4000ft' : '5000ft',
    confidence: idx === 0 ? 76 : 68,
    windScore: idx === 0 ? 'Favorable' : 'Headwind',
    note: 'Fallback arrival generated because no curated STAR dataset exists for this airport.',
    path: [],
  }));
}

function withFallbackPath(procedures, airport, route, mode) {
  if (!airport?.lat || !airport?.lon) return procedures;
  const routePoints = route?.waypoints ?? [];

  return procedures.map((proc, idx) => {
    if (proc.path?.length) return proc;
    if (mode === 'sid') {
      const target = routePoints.find((w) => w.type === 'fix') ?? routePoints[1] ?? { lat: airport.lat + 0.3, lon: airport.lon + 0.3 };
      return {
        ...proc,
        path: [
          [airport.lat, airport.lon],
          [airport.lat + 0.08 + idx * 0.04, airport.lon + 0.10 - idx * 0.03],
          [target.lat, target.lon],
        ],
      };
    }

    const fixes = routePoints.filter((w) => w.type === 'fix');
    const entry = fixes.length ? fixes[fixes.length - 1] : routePoints.at(-2) ?? { lat: airport.lat - 0.3, lon: airport.lon - 0.3 };
    return {
      ...proc,
      path: [
        [entry.lat, entry.lon],
        [airport.lat - 0.10 - idx * 0.03, airport.lon - 0.08 + idx * 0.04],
        [airport.lat, airport.lon],
      ],
    };
  });
}

const SIDS = {
  EDDF: [
    { id: 'ANEKI1G', name: 'ANEKI 1G', runway: '07L', initialAlt: 'FL080', confidence: 92, windScore: 'Favorable', note: 'Wind aligned with runway heading. Recommended.', path: [[50.0379, 8.5622], [50.08, 8.32], [50.112, 8.020]] },
    { id: 'BIBAK2G', name: 'BIBAK 2G', runway: '07L', initialAlt: 'FL080', confidence: 88, windScore: 'Favorable', note: 'Good option for westbound departures.',            path: [[50.0379, 8.5622], [50.07, 8.27], [50.089, 7.985]] },
    { id: 'MARUN1G', name: 'MARUN 1G', runway: '25R', initialAlt: 'FL080', confidence: 61, windScore: 'Crosswind', note: 'Runway 25R has 10kt crosswind. Acceptable.',        path: [[50.0379, 8.5622], [50.04, 8.67], [50.023, 8.112]] },
    { id: 'TOBAK1G', name: 'TOBAK 1G', runway: '25R', initialAlt: 'FL080', confidence: 55, windScore: 'Crosswind', note: 'Use if MARUN unavailable. Longer initial climb.',   path: [[50.0379, 8.5622], [50.03, 8.72], [50.011, 8.231]] },
  ],
  EDDM: [
    { id: 'GIVMI1N', name: 'GIVMI 1N', runway: '08L', initialAlt: 'FL060', confidence: 89, windScore: 'Favorable', note: 'Light winds. Smooth departure expected.',           path: [[48.3537, 11.7750], [48.42, 11.90], [48.456, 11.989]] },
    { id: 'KERAX1N', name: 'KERAX 1N', runway: '08L', initialAlt: 'FL060', confidence: 82, windScore: 'Favorable', note: 'Alternative for GIVMI. Similar profile.',           path: [[48.3537, 11.7750], [48.38, 11.95], [48.389, 12.112]] },
  ],
  LFPG: [
    { id: 'NURMO1A', name: 'NURMO 1A', runway: '27L', initialAlt: 'FL070', confidence: 85, windScore: 'Favorable', note: 'Prevailing westerlies assist departure.',           path: [[49.0097, 2.5479], [49.06, 2.34], [49.112, 2.089]] },
    { id: 'OKASI1A', name: 'OKASI 1A', runway: '09R', initialAlt: 'FL070', confidence: 67, windScore: 'Headwind',  note: '12kt headwind on runway 09R. Higher fuel burn.',   path: [[49.0097, 2.5479], [48.98, 2.67], [48.956, 2.821]] },
  ],
  EHAM: [
    { id: 'ANDIK1A', name: 'ANDIK 1A', runway: '36C', initialAlt: 'FL060', confidence: 91, windScore: 'Favorable', note: 'Best option given current southwesterly winds.',    path: [[52.3086, 4.7639], [52.42, 4.74], [52.512, 4.734]] },
    { id: 'REMKO1A', name: 'REMKO 1A', runway: '22',  initialAlt: 'FL060', confidence: 78, windScore: 'Favorable', note: 'Good alternative for southbound routing.',          path: [[52.3086, 4.7639], [52.21, 4.66], [52.143, 4.612]] },
  ],
};

export function getSIDs(icao, airport = null, route = null) {
  const weather = getWeather(icao)
  const curated = SIDS[icao] ?? createFallbackSIDs(icao, weather)
  return withFallbackPath(curated, airport, route, 'sid')
}

// ─── STARs ────────────────────────────────────────────────────────────────────

const STARS = {
  EGLL: [
    { id: 'SILVA1F', name: 'SILVA 1F', runway: '27L', finalAlt: '3000ft', confidence: 94, windScore: 'Favorable', note: 'Runway 27L is into wind (240°). Recommended.',   path: [[51.408, 0.152], [51.44, -0.08], [51.4775, -0.4614]] },
    { id: 'COWLY1A', name: 'COWLY 1A', runway: '27L', finalAlt: '3000ft', confidence: 87, windScore: 'Favorable', note: 'Good secondary option for 27L arrivals.',          path: [[51.356, 0.089], [51.41, -0.11], [51.4775, -0.4614]] },
    { id: 'BIGGIN1F',name: 'BIGGIN 1F', runway: '09R', finalAlt: '3000ft', confidence: 58, windScore: 'Tailwind',  note: '18kt tailwind on 09R. Not recommended.',           path: [[51.332, 0.034], [51.38,  0.22], [51.4775, -0.4614]] },
    { id: 'OCK1G',   name: 'OCK 1G',   runway: '09R', finalAlt: '3000ft', confidence: 52, windScore: 'Tailwind',  note: 'Use only if 27L/27R unavailable.',                 path: [[51.299, -0.447],[51.36, -0.23], [51.4775, -0.4614]] },
  ],
  EDDM: [
    { id: 'ROKIL1A', name: 'ROKIL 1A', runway: '26L', finalAlt: '4000ft', confidence: 90, windScore: 'Favorable', note: 'Light winds. Smooth approach expected.',           path: [[48.234, 11.456], [48.29, 11.61], [48.3537, 11.7750]] },
    { id: 'ASPAT1A', name: 'ASPAT 1A', runway: '26L', finalAlt: '4000ft', confidence: 83, windScore: 'Favorable', note: 'Alternative STAR with longer descent profile.',    path: [[48.189, 11.389], [48.26, 11.57], [48.3537, 11.7750]] },
  ],
  LFPG: [
    { id: 'MOROK1A', name: 'MOROK 1A', runway: '27L', finalAlt: '3000ft', confidence: 86, windScore: 'Favorable', note: 'Into wind on 27L. Standard arrival.',             path: [[49.112, 2.089], [49.07, 2.32], [49.0097, 2.5479]] },
    { id: 'LORNI1A', name: 'LORNI 1A', runway: '09R', finalAlt: '3000ft', confidence: 70, windScore: 'Crosswind', note: 'Crosswind arrival. Higher workload.',              path: [[48.956, 2.821], [48.99, 2.68], [49.0097, 2.5479]] },
  ],
  EHAM: [
    { id: 'SUGOL1A', name: 'SUGOL 1A', runway: '18R', finalAlt: '3000ft', confidence: 89, windScore: 'Favorable', note: 'Best option for current wind conditions.',         path: [[52.512, 4.734], [52.42, 4.74], [52.3086, 4.7639]] },
    { id: 'RIVER1A', name: 'RIVER 1A', runway: '22',  finalAlt: '3000ft', confidence: 77, windScore: 'Favorable', note: 'Alternate routing via coast.',                    path: [[52.143, 4.612], [52.21, 4.68], [52.3086, 4.7639]] },
  ],
};

export function getSTARs(icao, airport = null, route = null) {
  const weather = getWeather(icao)
  const curated = STARS[icao] ?? createFallbackSTARs(icao, weather)
  return withFallbackPath(curated, airport, route, 'star')
}

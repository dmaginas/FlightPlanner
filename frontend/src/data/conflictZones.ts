export type ConflictLevel = 'avoid' | 'caution'

export interface ConflictZone {
  id: string
  name: string
  level: ConflictLevel
  reason: string
  positions: [number, number][]  // [lat, lon]
}

// ── Point-in-polygon (ray casting) ────────────────────────────────────────────

function pointInPolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [aLat, aLon] = polygon[i]
    const [bLat, bLon] = polygon[j]
    const intersects =
      ((aLon > lon) !== (bLon > lon)) &&
      lat < ((bLat - aLat) * (lon - aLon)) / (bLon - aLon) + aLat
    if (intersects) inside = !inside
  }
  return inside
}

// ── Route vs zone intersection ─────────────────────────────────────────────────

interface Waypoint { lat?: number; lon?: number }

export function checkRouteConflicts(
  waypoints: Waypoint[],
  zones: ConflictZone[],
): ConflictZone[] {
  return zones.filter(zone => {
    for (const wp of waypoints) {
      if (wp.lat != null && wp.lon != null &&
          pointInPolygon(wp.lat, wp.lon, zone.positions)) return true
    }
    for (let i = 1; i < waypoints.length; i++) {
      const a = waypoints[i - 1], b = waypoints[i]
      if (a.lat != null && a.lon != null && b.lat != null && b.lon != null) {
        for (let t = 1; t <= 9; t++) {
          const lat = a.lat + (t / 10) * (b.lat - a.lat)
          const lon = a.lon + (t / 10) * (b.lon - a.lon)
          if (pointInPolygon(lat, lon, zone.positions)) return true
        }
      }
    }
    return false
  })
}

// ── Zone definitions ───────────────────────────────────────────────────────────

export const CONFLICT_ZONES: ConflictZone[] = [
  {
    id: 'ukraine',
    name: 'Ukraine',
    level: 'avoid',
    reason: 'Armed conflict — airspace closed (NOTAM A0132/22). Operations prohibited.',
    positions: [
      [52.4, 22.1], [53.9, 27.0], [52.1, 33.0], [51.4, 35.5],
      [49.5, 39.5], [47.5, 39.9], [46.5, 38.5], [45.5, 36.0],
      [45.3, 33.5], [44.5, 33.7], [45.5, 30.8], [45.4, 28.8],
      [45.2, 26.8], [46.5, 24.8], [48.1, 23.2], [49.5, 22.5],
    ],
  },
  {
    id: 'russia',
    name: 'Russia',
    level: 'avoid',
    reason: 'Airspace closed to EU/UK/US operators following Feb 2022 sanctions.',
    positions: [
      [60.5, 22.5], [65.0, 24.5], [69.5, 27.0], [71.0, 31.0],
      [71.5, 40.0], [72.5, 55.0], [72.5, 72.0], [68.5, 84.0],
      [67.0, 103.0], [65.0, 130.0], [60.0, 150.0], [54.0, 160.0],
      [51.0, 158.0], [46.5, 143.0], [43.5, 132.0], [47.5, 130.0],
      [50.5, 116.0], [49.5, 100.0], [51.5, 80.0], [51.5, 61.0],
      [47.0, 54.5], [43.5, 47.5], [42.5, 44.5], [43.5, 40.5],
      [47.0, 39.0], [48.5, 40.5], [50.5, 40.0], [55.5, 38.5],
      [59.5, 29.5],
    ],
  },
  {
    id: 'belarus',
    name: 'Belarus',
    level: 'avoid',
    reason: 'EU carriers banned from UMMV FIR following the forced diversion of FR4978 (Jun 2021).',
    positions: [
      [56.2, 24.0], [56.0, 28.5], [54.5, 32.7], [52.5, 31.8],
      [51.3, 30.5], [51.3, 27.0], [51.6, 24.4], [53.5, 23.3],
    ],
  },
  {
    id: 'iran',
    name: 'Iran',
    level: 'avoid',
    reason: 'Active conflict risk and ballistic missile/drone activity. Many carriers suspend operations.',
    positions: [
      [39.5, 44.0], [39.5, 48.5], [38.5, 56.5], [37.4, 60.0],
      [36.0, 61.5], [32.0, 61.5], [28.0, 62.5], [25.3, 59.5],
      [25.0, 55.0], [26.5, 54.0], [26.5, 50.0], [29.5, 48.0],
      [31.5, 47.0], [33.5, 46.0], [35.0, 45.5], [37.5, 44.8],
    ],
  },
  {
    id: 'syria',
    name: 'Syria',
    level: 'avoid',
    reason: 'Active armed conflict. Unreliable ATC, unpublished military activity (ICAO Level 2).',
    positions: [
      [37.0, 35.7], [37.3, 37.5], [37.0, 41.0], [36.5, 42.3],
      [34.5, 42.3], [33.0, 40.0], [32.5, 38.5], [32.8, 36.0],
      [33.5, 35.8], [36.0, 35.7],
    ],
  },
  {
    id: 'yemen',
    name: 'Yemen',
    level: 'avoid',
    reason: 'Active armed conflict, Houthi ballistic missile and drone activity over Red Sea.',
    positions: [
      [19.0, 43.5], [17.5, 43.0], [16.5, 43.5], [15.0, 42.5],
      [13.0, 43.5], [12.0, 45.0], [12.0, 48.0], [12.5, 51.5],
      [14.5, 54.5], [17.0, 55.5], [19.5, 55.5], [19.0, 52.0],
      [17.5, 50.0], [17.0, 47.0], [18.0, 44.5],
    ],
  },
  {
    id: 'libya',
    name: 'Libya',
    level: 'avoid',
    reason: 'Active civil conflict. Multiple restricted zones, unpublished military activity.',
    positions: [
      [33.5, 9.5], [33.3, 12.0], [32.9, 15.0], [33.0, 20.0],
      [33.0, 24.0], [31.0, 25.0], [24.0, 25.0], [20.0, 25.0],
      [20.0, 14.0], [23.5, 14.0], [24.0, 12.0], [24.0, 9.5],
      [30.0, 9.5],
    ],
  },
  {
    id: 'sudan',
    name: 'Sudan',
    level: 'avoid',
    reason: 'Active armed conflict since April 2023. Multiple operators have suspended services.',
    positions: [
      [22.0, 24.0], [22.0, 32.0], [22.0, 37.0], [19.0, 39.0],
      [17.0, 41.5], [15.0, 42.5], [12.0, 43.0], [10.0, 42.0],
      [8.0, 39.0], [5.5, 35.5], [3.5, 31.5], [3.5, 24.0],
      [9.0, 24.0],
    ],
  },
  {
    id: 'north_korea',
    name: 'North Korea',
    level: 'avoid',
    reason: 'Airspace closed to civil aviation. Ballistic missile test activity without NOTAM.',
    positions: [
      [42.5, 124.5], [42.5, 130.5], [40.0, 130.5],
      [38.5, 128.5], [38.0, 125.5], [38.5, 124.5], [40.0, 124.0],
    ],
  },
  {
    id: 'iraq',
    name: 'Iraq',
    level: 'caution',
    reason: 'ICAO/FAA Level 1 advisory. Verify current NOTAMs before overflying.',
    positions: [
      [37.5, 38.5], [37.5, 44.5], [36.0, 46.0], [35.0, 46.0],
      [33.0, 48.0], [31.0, 47.5], [29.5, 47.7], [29.5, 44.0],
      [30.5, 40.5], [32.5, 38.8], [34.5, 40.5],
    ],
  },
  {
    id: 'afghanistan',
    name: 'Afghanistan',
    level: 'caution',
    reason: 'ICAO safety advisory active. Altitude restrictions FL250–FL300 in OAKX FIR.',
    positions: [
      [38.0, 61.0], [37.5, 65.0], [38.0, 68.0], [37.0, 70.0],
      [36.5, 72.5], [36.0, 74.5], [33.0, 74.0], [30.0, 71.0],
      [29.5, 65.0], [29.5, 62.0], [31.0, 61.5], [33.5, 60.5], [36.0, 62.0],
    ],
  },
  {
    id: 'somalia',
    name: 'Somalia',
    level: 'caution',
    reason: 'Security risk from ballistic weapons activity (ICAO Level 2 advisory). Overflight above FL260.',
    positions: [
      [12.0, 41.5], [11.5, 44.0], [11.0, 50.5], [9.5, 53.0],
      [6.0, 55.0], [2.0, 50.0], [0.5, 44.0], [0.5, 41.5],
      [3.5, 40.5], [7.0, 42.0], [10.5, 42.5],
    ],
  },
]

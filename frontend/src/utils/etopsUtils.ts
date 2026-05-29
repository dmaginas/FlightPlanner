// ETOPS certification (minutes) per aircraft — null = 4-engine or not applicable
export const ETOPS_MINUTES: Record<string, number | null> = {
  // Airbus narrowbody ceo
  A318: 120, A319: 120, A320: 120, A321: 120,
  // Airbus narrowbody neo
  A19N: 180, A20N: 180, A21N: 180,
  // Airbus widebody
  A332: 180, A333: 180,
  A343: null,  // 4-engine
  A359: 180,
  A388: null,  // 4-engine
  // Boeing 737 ceo
  B734: 120, B737: 120, B738: 120, B739: 120,
  // Boeing 737 MAX
  B37M: 180, B38M: 180, B39M: 180, B3XM: 180,
  // Boeing widebody
  B744: null, B748: null,  // 4-engine
  B752: 180, B763: 180,
  B772: 207, B773: 207, B77W: 207,
  B788: 180, B789: 180,
  // Embraer regional — no ETOPS
  E145: null, E170: null, E190: null, E195: null, E75L: null,
}

import { haversineNm } from './geoUtils'

// ── Public types ───────────────────────────────────────────────────────────────

export interface EtopsInfo {
  etopsMinutes: number | null
  oeiSpeedKts: number   // ~80 % of cruise speed
  radiusNm: number
  applicable: boolean
}

export interface EtpResult {
  lat: number
  lon: number
  distFromDepNm: number
  timeToDepMin: number
  timeToArrMin: number
}

export interface EtopsRouteAnalysis {
  totalDistNm: number
  depCoverageNm: number   // route distance covered from DEP side
  arrCoverageNm: number   // route distance covered from ARR side
  gapNm: number           // uncovered segment length (0 = compliant)
  compliant: boolean
  etp: EtpResult | null
}

// ── Public functions ───────────────────────────────────────────────────────────

export function getEtopsInfo(profile: { icaoCode: string; cruiseSpeedKts: number }): EtopsInfo {
  const etopsMinutes = ETOPS_MINUTES[profile.icaoCode] ?? null
  const oeiSpeedKts  = Math.round(profile.cruiseSpeedKts * 0.80)
  const radiusNm     = etopsMinutes != null ? Math.round(etopsMinutes * oeiSpeedKts / 60) : 0
  return { etopsMinutes, oeiSpeedKts, radiusNm, applicable: etopsMinutes != null }
}

export interface EtopsKeyPoints {
  eep: [number, number] | null   // ETOPS Entry Point — where route exits DEP circle
  exp: [number, number] | null   // ETOPS Exit Point  — where route enters ARR circle
  gapCoords: [number, number][]  // route coordinates spanning the gap (EEP → EXP)
}

/** Find EEP, EXP and the gap polyline for the given route and ETOPS radius. */
export function findEtopsKeyPoints(
  dep: { lat: number; lon: number },
  arr: { lat: number; lon: number },
  waypoints: Array<{ lat?: number | null; lon?: number | null; type?: string }>,
  radiusNm: number,
): EtopsKeyPoints {
  const raw: [number, number][] = [
    [dep.lat, dep.lon],
    ...waypoints
      .filter(w => w.type !== 'airport' && w.lat != null && w.lon != null)
      .map(w => [w.lat!, w.lon!] as [number, number]),
    [arr.lat, arr.lon],
  ]
  const coords: [number, number][] = []
  for (const pt of raw) {
    const prev = coords[coords.length - 1]
    if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) coords.push(pt)
  }
  if (coords.length < 2) return { eep: null, exp: null, gapCoords: [] }

  const lerp = (a: [number, number], b: [number, number], t: number): [number, number] =>
    [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

  // EEP: first segment where straight-line distance from DEP crosses radiusNm outward
  let eep: [number, number] | null = null
  let eepIdx = -1
  for (let i = 1; i < coords.length; i++) {
    const d0 = haversineNm(dep.lat, dep.lon, coords[i-1][0], coords[i-1][1])
    const d1 = haversineNm(dep.lat, dep.lon, coords[i][0],   coords[i][1])
    if (d0 <= radiusNm && d1 > radiusNm) {
      const t = (radiusNm - d0) / (d1 - d0)
      eep    = lerp(coords[i-1], coords[i], t)
      eepIdx = i
      break
    }
  }

  // EXP: first segment (scanning from ARR backward) where distance from ARR crosses radiusNm inward
  let exp: [number, number] | null = null
  let expIdx = -1
  for (let i = coords.length - 2; i >= 0; i--) {
    const d0 = haversineNm(arr.lat, arr.lon, coords[i][0],   coords[i][1])
    const d1 = haversineNm(arr.lat, arr.lon, coords[i+1][0], coords[i+1][1])
    if (d1 <= radiusNm && d0 > radiusNm) {
      const t = (radiusNm - d0) / (d1 - d0)
      exp    = lerp(coords[i], coords[i+1], t)
      expIdx = i + 1
      break
    }
  }

  // Gap coordinates: EEP → intermediate waypoints → EXP
  let gapCoords: [number, number][] = []
  if (eep && exp && eepIdx >= 0 && expIdx >= 0 && eepIdx <= expIdx) {
    gapCoords = [eep, ...coords.slice(eepIdx, expIdx), exp]
  }

  return { eep, exp, gapCoords }
}

export function analyseEtopsRoute(
  dep: { lat: number; lon: number },
  arr: { lat: number; lon: number },
  waypoints: Array<{ lat?: number | null; lon?: number | null; type?: string }>,
  radiusNm: number,
  oeiSpeedKts: number,
): EtopsRouteAnalysis {
  // Build coordinate list (exclude airport-type waypoints — dep/arr added explicitly)
  const raw: [number, number][] = [
    [dep.lat, dep.lon],
    ...waypoints
      .filter(w => w.type !== 'airport' && w.lat != null && w.lon != null)
      .map(w => [w.lat!, w.lon!] as [number, number]),
    [arr.lat, arr.lon],
  ]

  // Deduplicate consecutive identical points
  const coords: [number, number][] = []
  for (const pt of raw) {
    const prev = coords[coords.length - 1]
    if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) coords.push(pt)
  }

  if (coords.length < 2) {
    return { totalDistNm: 0, depCoverageNm: 0, arrCoverageNm: 0, gapNm: 0, compliant: true, etp: null }
  }

  // Cumulative route distance at each coord
  const cumDist: number[] = [0]
  for (let i = 1; i < coords.length; i++) {
    cumDist.push(cumDist[i - 1] + haversineNm(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1]))
  }
  const totalDistNm = cumDist[cumDist.length - 1]

  if (totalDistNm < 1) {
    return { totalDistNm: 0, depCoverageNm: 0, arrCoverageNm: 0, gapNm: 0, compliant: true, etp: null }
  }

  // DEP coverage: furthest route distance still within ETOPS radius of DEP
  // ARR coverage: furthest route distance (from arr end) still within ETOPS radius of ARR
  let depCoverageNm = 0
  let arrCoverageNm = 0
  for (let i = 0; i < coords.length; i++) {
    if (haversineNm(dep.lat, dep.lon, coords[i][0], coords[i][1]) <= radiusNm)
      depCoverageNm = Math.max(depCoverageNm, cumDist[i])
    if (haversineNm(arr.lat, arr.lon, coords[i][0], coords[i][1]) <= radiusNm)
      arrCoverageNm = Math.max(arrCoverageNm, totalDistNm - cumDist[i])
  }

  const gapNm    = Math.max(0, Math.round(totalDistNm - depCoverageNm - arrCoverageNm))
  const compliant = gapNm === 0

  // ETP: interpolated midpoint along the route (simplified, no wind)
  const etpDist = totalDistNm / 2
  let etpLat = (dep.lat + arr.lat) / 2
  let etpLon = (dep.lon + arr.lon) / 2
  for (let i = 1; i < coords.length; i++) {
    if (cumDist[i] >= etpDist) {
      const segLen = cumDist[i] - cumDist[i - 1]
      const t      = segLen > 0 ? (etpDist - cumDist[i - 1]) / segLen : 0
      etpLat = coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t
      etpLon = coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t
      break
    }
  }

  const etp: EtpResult = {
    lat:            etpLat,
    lon:            etpLon,
    distFromDepNm:  Math.round(etpDist),
    timeToDepMin:   Math.round(etpDist / oeiSpeedKts * 60),
    timeToArrMin:   Math.round((totalDistNm - etpDist) / oeiSpeedKts * 60),
  }

  return {
    totalDistNm:    Math.round(totalDistNm),
    depCoverageNm:  Math.round(depCoverageNm),
    arrCoverageNm:  Math.round(arrCoverageNm),
    gapNm,
    compliant,
    etp,
  }
}

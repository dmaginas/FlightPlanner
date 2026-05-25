import { apiClient } from '../api/apiClient'

export interface GrametWaypointInput {
  id: string
  lat: number
  lon: number
  distanceNm: number
}

export interface GrametLevelData {
  pressureHPa: number
  flightLevelFt: number
  tempC: number | null
  windSpeedKt: number | null
  windDirDeg: number | null
  cloudCoverPct: number
}

export interface GrametWaypointData {
  id: string
  lat: number
  lon: number
  distanceNm: number
  levels: GrametLevelData[]
}

export interface GrametData {
  waypoints: GrametWaypointData[]
  generatedAt: string
}

export function fetchGramet(
  waypoints: GrametWaypointInput[],
  signal?: AbortSignal,
): Promise<GrametData> {
  return apiClient.post<GrametData>('/api/gramet', { waypoints }, signal)
}

import { apiClient } from '../api/apiClient'

export interface WindRequestWaypoint { lat: number; lon: number }

export interface WindWaypointResult {
  lat: number; lon: number
  windSpeedKts: number; windDirDeg: number; headwindKts: number
}

export interface WindsResponse {
  averageHeadwindKts: number
  waypoints: WindWaypointResult[]
  sampledPressureHPa: number
  fetchedAt: string
}

export function fetchWinds(
  waypoints: WindRequestWaypoint[],
  altitudeFt: number,
  signal?: AbortSignal,
): Promise<WindsResponse> {
  return apiClient.post<WindsResponse>('/api/winds', { waypoints, altitudeFt }, signal)
}

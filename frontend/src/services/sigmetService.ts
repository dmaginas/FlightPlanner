import { apiClient } from '../api/apiClient'

export interface SigmetItem {
  id: string
  type: string       // 'SIGMET' | 'AIRMET'
  hazard: string     // 'TS' | 'TURB' | 'ICE' | 'IFR' | 'MTN OBSCN' | 'LLWS' | ...
  severity?: string
  altLowFt?: number
  altHighFt?: number
  validTo?: string
  rawText: string
  coords?: [number, number][]  // polygon vertices as [lat, lon] pairs
}

export interface SigmetResponse {
  items: SigmetItem[]
  fetchedAt: string
}

export function fetchAllSigmets(signal?: AbortSignal): Promise<SigmetResponse> {
  return apiClient.get<SigmetResponse>('/api/sigmet', signal)
}

export function fetchSigmets(
  depLat: number, depLon: number,
  arrLat: number, arrLon: number,
  signal?: AbortSignal,
): Promise<SigmetResponse> {
  return apiClient.get<SigmetResponse>(
    `/api/sigmet?depLat=${depLat}&depLon=${depLon}&arrLat=${arrLat}&arrLon=${arrLon}`,
    signal,
  )
}

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
}

export interface SigmetResponse {
  items: SigmetItem[]
  fetchedAt: string
}

export function fetchSigmets(
  depLat: number, depLon: number,
  arrLat: number, arrLon: number,
  signal?: AbortSignal,
): Promise<SigmetResponse> {
  return apiClient.get<SigmetResponse>(
    `/api/sigmets?depLat=${depLat}&depLon=${depLon}&arrLat=${arrLat}&arrLon=${arrLon}`,
    signal,
  )
}

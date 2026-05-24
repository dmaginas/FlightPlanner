import { apiClient } from '../api/apiClient'

export interface VorItem  { ident: string; name: string; lat: number; lon: number; freqMhz: number }
export interface NdbItem  { ident: string; name: string; lat: number; lon: number; freqKhz: number }
export interface FixItem  { ident: string; lat: number; lon: number }
export interface AirwaySegItem { airway: string; fromLat: number; fromLon: number; toLat: number; toLon: number }

export interface NavDataBboxResult {
  vors:    VorItem[]
  ndbs:    NdbItem[]
  fixes:   FixItem[]
  airways: AirwaySegItem[]
}

export async function fetchNavData(
  swLat: number, swLon: number,
  neLat: number, neLon: number,
  types: string[],
  signal?: AbortSignal,
): Promise<NavDataBboxResult> {
  const qs = new URLSearchParams({
    swLat: String(swLat),
    swLon: String(swLon),
    neLat: String(neLat),
    neLon: String(neLon),
    types: types.join(','),
  })
  return apiClient.get<NavDataBboxResult>(`/api/navdata?${qs}`, signal)
}

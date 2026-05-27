import { apiClient } from '../api/apiClient.ts'

export interface ProcFix {
  ident: string
  lat:   number | null
  lon:   number | null
}

export interface ApiProcedure {
  name:   string
  runway: string    // e.g. "07C" (backend already strips the "RW" prefix)
  fixes:  ProcFix[]
}

export interface ProceduresResponse {
  sids:  ApiProcedure[]
  stars: ApiProcedure[]
}

// Shape that ProcSelector, SIDScreen, STARScreen, and RouteMap all consume
export interface DisplayProcedure {
  id:     string               // unique key, e.g. "ANEKI1G-07C"
  name:   string               // e.g. "ANEKI1G"
  runway: string               // e.g. "07C"
  path:   [number, number][]   // [[lat, lon], …] — only fixes with resolved coords
}

export async function fetchProcedures(
  icao:   string,
  signal?: AbortSignal,
): Promise<ProceduresResponse> {
  return apiClient.get<ProceduresResponse>(`/api/procedures/${encodeURIComponent(icao)}`, signal)
}

export function toDisplayProcedures(procs: ApiProcedure[]): DisplayProcedure[] {
  return procs.map(proc => ({
    id:     `${proc.name}-${proc.runway || 'ALL'}`,
    name:   proc.name,
    runway: proc.runway,
    path:   proc.fixes
              .filter(f => f.lat !== null && f.lon !== null)
              .map(f => [f.lat!, f.lon!] as [number, number]),
  }))
}

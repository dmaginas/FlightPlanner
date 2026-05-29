import { apiClient } from '../api/apiClient'

export interface ChartInfo {
  id:     string
  name:   string
  type:   'APT' | 'DEP' | 'ARR' | 'APP' | 'REF' | 'OTHER'
  source: 'faa' | 'chartfox'
}

export interface ChartListData {
  icao:   string
  charts: ChartInfo[]
}

export async function fetchCharts(
  icao:    string,
  signal?: AbortSignal,
): Promise<ChartListData> {
  return apiClient.get<ChartListData>(`/api/airport/${icao}/charts`, signal)
}

export function chartFileUrl(icao: string, source: string, id: string): string {
  return `/api/airport/${encodeURIComponent(icao)}/charts/${source}/${encodeURIComponent(id)}/file`
}

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

export interface ChartFoxStatus {
  connected:  boolean
  configured: boolean
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

export async function fetchChartFoxStatus(signal?: AbortSignal): Promise<ChartFoxStatus> {
  return apiClient.get<ChartFoxStatus>('/api/chartfox/status', signal)
}

export async function fetchChartFoxAuthUrl(signal?: AbortSignal): Promise<string> {
  const data = await apiClient.get<{ url: string }>('/api/chartfox/auth-url', signal)
  return data.url
}

export async function disconnectChartFox(): Promise<void> {
  await apiClient.post('/api/chartfox/disconnect', {})
}

import { apiClient, ApiClientError } from '../api/apiClient'

export type NotamItem = {
  id: string
  number: string
  text: string
  effectiveStart: string
  effectiveEnd: string | null
  classification: string
}

export type NotamRecord = {
  icao: string
  notams: NotamItem[]
  total: number
}

export class NotamServiceError extends Error {
  kind: 'invalid_icao' | 'http' | 'network' | 'config_error'
  status?: number

  constructor(kind: NotamServiceError['kind'], message: string, status?: number) {
    super(message)
    this.name = 'NotamServiceError'
    this.kind = kind
    this.status = status
  }
}

const ICAO_PATTERN = /^[A-Z0-9]{4}$/

function normalizeIcao(icao: string | null | undefined): string | null {
  const code = icao?.trim().toUpperCase() ?? ''
  return ICAO_PATTERN.test(code) ? code : null
}

export async function fetchNotamsByIcao(icao: string, signal?: AbortSignal): Promise<NotamRecord | null> {
  const code = normalizeIcao(icao)
  if (!code) return null

  const path = `/api/notam?icao=${encodeURIComponent(code)}`

  try {
    const data = await apiClient.get<{ notams: NotamItem[]; total: number }>(path, signal)
    return { icao: code, notams: data.notams ?? [], total: data.total ?? 0 }
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error

    if (error instanceof ApiClientError) {
      if (error.status === 503) {
        throw new NotamServiceError('config_error', error.message, error.status)
      }
      throw new NotamServiceError('http', error.message || `NOTAM request failed with status ${error.status}.`, error.status)
    }

    throw new NotamServiceError('network', 'Unable to reach the FlightPlanner backend for NOTAM data.')
  }
}

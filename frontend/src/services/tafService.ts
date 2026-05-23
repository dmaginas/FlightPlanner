import { apiClient, ApiClientError } from '../api/apiClient'

export type TafRecord = {
  icao: string
  rawText: string
}

export class TafServiceError extends Error {
  kind: 'invalid_icao' | 'http' | 'network' | 'empty_response'
  status?: number

  constructor(kind: TafServiceError['kind'], message: string, status?: number) {
    super(message)
    this.name = 'TafServiceError'
    this.kind = kind
    this.status = status
  }
}

const ICAO_PATTERN = /^[A-Z0-9]{4}$/

export function normalizeIcaoCode(icao: string | null | undefined): string | null {
  const code = icao?.trim().toUpperCase() ?? ''
  return ICAO_PATTERN.test(code) ? code : null
}

export async function fetchTafByIcao(icao: string, signal?: AbortSignal): Promise<TafRecord | null> {
  const code = normalizeIcaoCode(icao)
  if (!code) return null

  const path = `/api/taf?icao=${encodeURIComponent(code)}`

  let rawText: string
  try {
    rawText = await apiClient.get<string>(path, signal)
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error

    if (error instanceof ApiClientError) {
      if (error.status === 404) {
        throw new TafServiceError('empty_response', 'No TAF is currently available for this airport.', error.status)
      }
      throw new TafServiceError('http', error.message || `TAF request failed with status ${error.status}.`, error.status)
    }

    throw new TafServiceError('network', 'Unable to reach the FlightPlanner backend for TAF data.')
  }

  const text = (rawText ?? '').trim()
  if (!text) throw new TafServiceError('empty_response', 'No TAF is currently available for this airport.')

  return { icao: code, rawText: text }
}

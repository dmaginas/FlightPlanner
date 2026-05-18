/**
 * metarService.ts — METAR data fetcher for the FlightPlanner frontend.
 *
 * Requests are routed through the ASP.NET Core backend (/api/metar) rather than
 * calling AviationWeather directly. AviationWeather does not return the
 * Access-Control-Allow-Origin header required by browsers, so direct browser
 * requests are blocked by the browser's CORS policy. The backend fetches the
 * data server-side and proxies the response.
 *
 * Direct AviationWeather URL (for reference only — not used in production):
 * https://aviationweather.gov/api/data/metar?ids=<ICAO>&format=raw
 *
 * CORS note:
 * Access-Control-Allow-Origin is a *response* header that must come from the
 * responding server. It cannot be set as a request header in browser JavaScript.
 * The ASP.NET Core backend handles CORS by setting this header appropriately.
 *
 * Configuration:
 * Set VITE_API_BASE_URL in frontend/.env to override the API base URL.
 * Example: VITE_API_BASE_URL=https://localhost:5001
 * Falls back to https://localhost:5001 if not set.
 */

// ASP.NET Core backend base URL.
// Falls back to https://localhost:5001 if VITE_API_BASE_URL is not configured.
// The port must not be hard-wired in production — always use VITE_API_BASE_URL.
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://localhost:5001'

// Regex for 4 uppercase alphanumeric characters (ICAO standard)
const ICAO_PATTERN = /^[A-Z0-9]{4}$/

export type MetarRecord = {
  icao: string
  rawText: string
}

export class MetarServiceError extends Error {
  kind: 'invalid_icao' | 'http' | 'network' | 'empty_response'
  status?: number

  constructor(kind: MetarServiceError['kind'], message: string, status?: number) {
    super(message)
    this.name = 'MetarServiceError'
    this.kind = kind
    this.status = status
  }
}

export function normalizeIcaoCode(icao: string | null | undefined): string | null {
  const code = icao?.trim().toUpperCase() ?? ''
  return ICAO_PATTERN.test(code) ? code : null
}

export async function fetchMetarByIcao(icao: string, signal?: AbortSignal): Promise<MetarRecord | null> {
  const code = normalizeIcaoCode(icao)
  if (!code) return null

  const url = `${API_BASE_URL}/api/metar?icao=${encodeURIComponent(code)}`

  let response: Response
  try {
    response = await fetch(url, {
      signal,
      method: 'GET',
    })
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error
    }

    if (error instanceof TypeError) {
      throw new MetarServiceError(
        'network',
        'Unable to reach the FlightPlanner backend for METAR data (network error).',
      )
    }

    throw new MetarServiceError('network', 'Unable to reach the FlightPlanner backend for METAR data.')
  }

  if (!response.ok) {
    // Versuche, das einheitliche JSON-Fehlerformat { error, details } vom Backend zu lesen
    let backendDetails: string | undefined
    try {
      const errorBody = await response.clone().json() as { error?: string; details?: string }
      backendDetails = errorBody?.details ?? errorBody?.error
    } catch {
      // JSON-Parsing fehlgeschlagen — rohen Text als Fallback verwenden
    }

    if (response.status === 404) {
      throw new MetarServiceError(
        'empty_response',
        backendDetails ?? 'No METAR is currently available for this airport.',
        response.status,
      )
    }

    throw new MetarServiceError(
      'http',
      backendDetails ?? `METAR request failed with status ${response.status}.`,
      response.status,
    )
  }

  const text = (await response.text()).trim()
  if (!text) {
    throw new MetarServiceError('empty_response', 'No METAR is currently available for this airport.')
  }

  const firstNonEmptyLine = text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstNonEmptyLine) {
    throw new MetarServiceError('empty_response', 'No METAR is currently available for this airport.')
  }

  return {
    icao: code,
    rawText: firstNonEmptyLine,
  }
}

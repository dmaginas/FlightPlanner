/**
 * metarService.ts — METAR data fetcher for the FlightPlanner frontend.
 *
 * Requests are routed through the selected FlightPlanner backend (/api/metar)
 * rather than calling AviationWeather directly. AviationWeather does not return
 * the Access-Control-Allow-Origin header required by browsers, so direct browser
 * requests are blocked by the browser's CORS policy. The backend fetches the
 * data server-side and proxies the response.
 *
 * Direct AviationWeather URL (for reference only — not used in production):
 *   https://aviationweather.gov/api/data/metar?ids=<ICAO>&format=raw
 *
 * Backend selection:
 *   Set VITE_API_BACKEND in frontend/.env to "node" or "aspnet".
 *   See frontend/.env.example and frontend/docs/backend-config.md for details.
 *
 * METAR endpoint (identical in both backends):
 *   GET /api/metar?icao=<ICAO>
 *   200 OK → text/plain  raw METAR string
 *   404    → JSON { error, details }   — no METAR available
 *   400    → JSON { error, details }   — invalid ICAO
 *
 * Mapper note:
 *   Both the Node.js and ASP.NET backends currently return the same response
 *   format (text/plain raw METAR). The mapper functions below are identity
 *   functions today. If the backends diverge in the future, update the
 *   appropriate mapper without touching the rest of the service.
 */

import { apiClient, ApiClientError } from '../api/apiClient'
import { apiConfig } from '../config/apiConfig'

// ── ICAO validation ───────────────────────────────────────────────────────────

/** Regex for 4 uppercase alphanumeric characters (ICAO standard). */
const ICAO_PATTERN = /^[A-Z0-9]{4}$/

// ── Domain types ──────────────────────────────────────────────────────────────

export type MetarRecord = {
  icao: string
  rawText: string
}

// ── Error type ────────────────────────────────────────────────────────────────

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

// ── ICAO normalisation ────────────────────────────────────────────────────────

export function normalizeIcaoCode(icao: string | null | undefined): string | null {
  const code = icao?.trim().toUpperCase() ?? ''
  return ICAO_PATTERN.test(code) ? code : null
}

// ── Backend-specific mappers ──────────────────────────────────────────────────
// Both backends currently return identical plain-text METAR responses.
// These mappers are no-ops today but are the single place to adapt if the
// backends diverge (e.g. if ASP.NET starts returning a JSON wrapper).

/** Maps the raw text returned by the Node.js backend to a MetarRecord. */
function mapNodeMetarResponse(rawText: string, icao: string): MetarRecord {
  const firstLine = rawText
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean) ?? rawText.trim()
  return { icao, rawText: firstLine }
}

/** Maps the raw text returned by the ASP.NET backend to a MetarRecord. */
function mapAspNetMetarResponse(rawText: string, icao: string): MetarRecord {
  // Currently identical to the Node.js mapper.
  // Update this function if the ASP.NET backend changes its response shape.
  const firstLine = rawText
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean) ?? rawText.trim()
  return { icao, rawText: firstLine }
}

/** Selects the appropriate mapper based on the active backend. */
function mapMetarResponse(rawText: string, icao: string): MetarRecord {
  return apiConfig.backend === 'node'
    ? mapNodeMetarResponse(rawText, icao)
    : mapAspNetMetarResponse(rawText, icao)
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches the raw METAR string for the given ICAO airport code.
 *
 * @param icao - Airport ICAO code (case-insensitive; will be normalised)
 * @param signal - Optional AbortSignal for request cancellation
 * @returns MetarRecord with the normalised ICAO and raw METAR text,
 *          or null if the ICAO code is invalid
 * @throws MetarServiceError on network errors, HTTP errors, or empty responses
 */
export async function fetchMetarByIcao(icao: string, signal?: AbortSignal): Promise<MetarRecord | null> {
  const code = normalizeIcaoCode(icao)
  if (!code) return null

  const path = `/api/metar?icao=${encodeURIComponent(code)}`

  let rawText: string
  try {
    rawText = await apiClient.get<string>(path, signal)
  } catch (error) {
    // Re-throw AbortError unchanged so callers can detect cancellation
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error
    }

    if (error instanceof ApiClientError) {
      if (error.status === 404) {
        throw new MetarServiceError(
          'empty_response',
          error.message || 'No METAR is currently available for this airport.',
          error.status,
        )
      }
      throw new MetarServiceError(
        'http',
        error.message || `METAR request failed with status ${error.status}.`,
        error.status,
      )
    }

    if (error instanceof TypeError) {
      throw new MetarServiceError(
        'network',
        'Unable to reach the FlightPlanner backend for METAR data (network error).',
      )
    }

    throw new MetarServiceError(
      'network',
      'Unable to reach the FlightPlanner backend for METAR data.',
    )
  }

  const text = (rawText ?? '').trim()
  if (!text) {
    throw new MetarServiceError('empty_response', 'No METAR is currently available for this airport.')
  }

  const record = mapMetarResponse(text, code)
  if (!record.rawText) {
    throw new MetarServiceError('empty_response', 'No METAR is currently available for this airport.')
  }

  return record
}

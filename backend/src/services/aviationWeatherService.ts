/**
 * aviationWeatherService.ts — Server-side AviationWeather METAR fetcher.
 *
 * This module fetches raw METAR text from AviationWeather server-side,
 * avoiding the browser CORS restriction that blocks direct browser requests
 * to https://aviationweather.gov.
 *
 * No API key is required for this endpoint.
 */

import { log } from '../utils/logger'

const AVIATION_WEATHER_BASE_URL = 'https://aviationweather.gov/api/data/metar'

export class AviationWeatherServiceError extends Error {
  public readonly kind: 'http' | 'network' | 'empty_response'
  public readonly status?: number

  constructor(kind: AviationWeatherServiceError['kind'], message: string, status?: number) {
    super(message)
    this.name = 'AviationWeatherServiceError'
    this.kind = kind
    this.status = status
  }
}

/**
 * Fetches raw METAR text for the given (already-validated) ICAO code.
 *
 * @param icao - Normalised, validated ICAO code (4 alphanumeric chars, uppercase)
 * @returns Raw METAR string (first non-empty line of the AviationWeather response)
 * @throws AviationWeatherServiceError on HTTP error, network error, or empty response
 */
export async function fetchRawMetar(icao: string): Promise<string> {
  const url = new URL(AVIATION_WEATHER_BASE_URL)
  url.searchParams.set('ids', icao)
  url.searchParams.set('format', 'raw')

  let response: Response
  try {
    response = await fetch(url.toString(), { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log('ERROR', `AviationWeather network error for ${icao}: ${message}`)
    throw new AviationWeatherServiceError(
      'network',
      'Unable to reach AviationWeather (network error). Please try again later.',
    )
  }

  if (!response.ok) {
    log('WARN', `AviationWeather HTTP ${response.status} for ${icao}`)
    throw new AviationWeatherServiceError(
      'http',
      `AviationWeather returned HTTP ${response.status}.`,
      response.status,
    )
  }

  const text = (await response.text()).trim()

  const firstLine = text
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean)

  if (!firstLine) {
    log('INFO', `AviationWeather returned empty body for ${icao}`)
    throw new AviationWeatherServiceError(
      'empty_response',
      'No METAR is currently available for this airport.',
    )
  }

  return firstLine
}

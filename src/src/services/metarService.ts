const AVIATION_WEATHER_BASE_URL = 'https://aviationweather.gov/api/data/metar'
const ICAO_PATTERN = /^[A-Z]{4}$/

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

export function buildMetarUrl(icao: string): string {
  const code = normalizeIcaoCode(icao)
  if (!code) throw new MetarServiceError('invalid_icao', 'Invalid ICAO code for METAR lookup.')

  const url = new URL(AVIATION_WEATHER_BASE_URL)
  url.searchParams.set('ids', code)
  url.searchParams.set('format', 'raw')

  return url.toString()
}

export async function fetchMetarByIcao(icao: string, signal?: AbortSignal): Promise<MetarRecord | null> {
  const code = normalizeIcaoCode(icao)
  if (!code) return null

  const requestUrl = buildMetarUrl(code)

  let response: Response
  try {
    response = await fetch(requestUrl, {
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
        'Unable to reach AviationWeather for METAR data (network/CORS error).',
      )
    }

    throw new MetarServiceError('network', 'Unable to reach AviationWeather for METAR data.')
  }

  if (!response.ok) {
    throw new MetarServiceError('http', `METAR request failed with status ${response.status}.`, response.status)
  }

  const text = (await response.text()).trim()
  if (!text) {
    throw new MetarServiceError('empty_response', 'No METAR is currently available for this airport.')
  }

  const firstNonEmptyLine = text.split('\n').map((line) => line.trim()).find(Boolean)
  if (!firstNonEmptyLine) {
    throw new MetarServiceError('empty_response', 'No METAR is currently available for this airport.')
  }

  return {
    icao: code,
    rawText: firstNonEmptyLine,
  }
}

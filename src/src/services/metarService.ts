const AVIATION_WEATHER_BASE_URL = 'https://aviationweather.gov/api/data/metar'

function toIsoIfPossible(value: string | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export type MetarRecord = {
  icao: string
  rawText: string
  reportTime: string | null
  flightCategory: string | null
}

export async function fetchMetarByIcao(icao: string): Promise<MetarRecord | null> {
  const code = icao?.trim().toUpperCase()
  if (!code || code.length !== 4) return null

  const params = new URLSearchParams({
    ids: code,
    format: 'json',
  })

  const response = await fetch(`${AVIATION_WEATHER_BASE_URL}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`METAR request failed with status ${response.status}`)
  }

  const data = await response.json()
  const entry = Array.isArray(data) ? data[0] : null
  if (!entry) return null

  return {
    icao: (entry.icaoId ?? code).toUpperCase(),
    rawText: entry.rawOb ?? entry.rawText ?? '',
    reportTime: toIsoIfPossible(entry.obsTime ?? entry.reportTime ?? entry.receiptTime),
    flightCategory: entry.flightCategory ?? null,
  }
}

const AVIATION_WEATHER_BASE_URL = 'https://aviationweather.gov/api/data/metar'
const ICAO_PATTERN = /^[A-Z]{4}$/

export type MetarRecord = {
  icao: string
  rawText: string
}

export function normalizeIcaoCode(icao: string | null | undefined): string | null {
  const code = icao?.trim().toUpperCase() ?? ''
  return ICAO_PATTERN.test(code) ? code : null
}

export async function fetchMetarByIcao(icao: string, signal?: AbortSignal): Promise<MetarRecord | null> {
  const code = normalizeIcaoCode(icao)
  if (!code) return null

  const params = new URLSearchParams({
    ids: code,
    format: 'raw',
  })

  const response = await fetch(`${AVIATION_WEATHER_BASE_URL}?${params.toString()}`, { signal })
  if (!response.ok) throw new Error(`METAR request failed with status ${response.status}`)

  const text = (await response.text()).trim()
  if (!text) return null

  const rawLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(code))
    ?? text.split('\n').map((line) => line.trim()).find(Boolean)

  if (!rawLine) return null

  return {
    icao: code,
    rawText: rawLine,
  }
}

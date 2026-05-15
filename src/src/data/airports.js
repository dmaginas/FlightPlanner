const OPENAIP_BASE_URL = (import.meta.env.VITE_OPENAIP_BASE_URL ?? 'https://api.core.openaip.net/api').replace(/\/$/, '')
const OPENAIP_API_KEY = import.meta.env.VITE_OPENAIP_API_KEY

function normalizeAirport(feature) {
  const props = feature?.properties ?? {}
  const geom = feature?.geometry
  const coords = Array.isArray(geom?.coordinates) ? geom.coordinates : []
  const icao = (props.icaoCode ?? '').toUpperCase()
  const iata = (props.iataCode ?? '').toUpperCase()

  if (!icao || coords.length < 2) return null

  return {
    icao,
    iata,
    name: props.name ?? icao,
    city: props.city ?? 'Unknown',
    country: props.country ?? 'Unknown',
    lat: coords[1],
    lon: coords[0],
    elevation: props.elevation?.value ?? 0,
  }
}

export async function searchAirports(query) {
  const q = query?.trim()
  if (!q || q.length < 2 || !OPENAIP_API_KEY) return []

  const params = new URLSearchParams({
    search: q,
    limit: '8',
  })

  const response = await fetch(`${OPENAIP_BASE_URL}/airports?${params.toString()}`, {
    headers: {
      'x-openaip-api-key': OPENAIP_API_KEY,
      Accept: 'application/json',
    },
  })

  if (!response.ok) return []

  const payload = await response.json()
  const items = Array.isArray(payload?.items) ? payload.items : []

  return items.map(normalizeAirport).filter(Boolean)
}

export async function getAirport(icao) {
  const code = icao?.toUpperCase()?.trim()
  if (!code || !OPENAIP_API_KEY) return null

  const params = new URLSearchParams({
    search: code,
    limit: '1',
  })

  const response = await fetch(`${OPENAIP_BASE_URL}/airports?${params.toString()}`, {
    headers: {
      'x-openaip-api-key': OPENAIP_API_KEY,
      Accept: 'application/json',
    },
  })

  if (!response.ok) return null

  const payload = await response.json()
  const items = Array.isArray(payload?.items) ? payload.items : []
  return items.map(normalizeAirport).find(a => a.icao === code) ?? items.map(normalizeAirport).find(Boolean) ?? null
}

export function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // Earth radius in NM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

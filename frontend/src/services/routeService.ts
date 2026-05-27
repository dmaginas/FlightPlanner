/**
 * routeService.ts — IFR route lookup service for the FlightPlanner frontend.
 *
 * Calls the active FlightPlanner backend (/api/routes) which in turn proxies
 * to the Flight Plan Database API. The FPD API key never leaves the server.
 *
 * Error kinds:
 *   'config_error'        — Backend API key missing (503 configuration_error)
 *   'not_found'           — No routes found (404)
 *   'external_api_failure'— FPD upstream or network error (502/503/5xx)
 *   'invalid_params'      — Bad request (400)
 *   'network'             — Could not reach our own backend
 *
 * On 'not_found' or 'external_api_failure', the caller should apply the local
 * frontend fallback. On 'config_error', show a hard error — do not fall back.
 */

import { apiClient, ApiClientError } from '../api/apiClient'

// ── Public types ───────────────────────────────────────────────────────────────

export interface RouteWaypoint {
  id: string
  name?: string | null
  lat?: number
  lon?: number
  type?: string
  airway?: string
  altLabel?: string  // CLB / CRZ / DSC / GND — enriched on the frontend
  distCum?: number   // cumulative NM — enriched on the frontend
}

export interface SelectedRoute {
  id?: string
  departure: string
  destination: string
  aircraftType?: string | null
  cruisingAltitude?: number | null
  routeType: 'IFR'
  routeText?: string | null
  waypoints: RouteWaypoint[]
  distanceNm?: number | null
  source: 'flight-plan-database' | 'navdata-airac2012' | 'local-fallback'
  // Compatibility fields expected by RouteMap / WaypointTable / AIPanel
  altitude?: string
  aircraft?: string
  airway?: string
  routeDistanceNm?: number
  etaMinutes?: number
  fuelEstimateTons?: number
  aircraftProfile?: unknown
  natTrackId?: string
}

export interface AlternativeRoute {
  id?: string | null
  routeText?: string | null
  distanceNm?: number | null
  updatedAt?: string | null
  popularity?: number | null
}

export interface RouteResult {
  selectedRoute: SelectedRoute
  alternatives: AlternativeRoute[]
  warning?: string
}

export type RouteErrorKind =
  | 'config_error'
  | 'not_found'
  | 'external_api_failure'
  | 'invalid_params'
  | 'network'

export class RouteServiceError extends Error {
  readonly kind: RouteErrorKind
  readonly status?: number

  constructor(kind: RouteErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'RouteServiceError'
    this.kind = kind
    this.status = status
  }
}

// ── Request params ─────────────────────────────────────────────────────────────

export interface FetchRouteParams {
  departure: string
  destination: string
  departureLat?: number
  departureLon?: number
  destinationLat?: number
  destinationLon?: number
  aircraftType?: string
  cruisingAltitude?: number
  routeType?: string
}

// ── Backend response shape ─────────────────────────────────────────────────────

interface BackendWaypoint {
  id: string
  name?: string | null
  lat?: number | null
  lon?: number | null
  type?: string | null
  airway?: string | null
}

interface BackendSelectedRoute {
  id?: string
  departure: string
  destination: string
  aircraftType?: string | null
  cruisingAltitude?: number | null
  routeType: string
  routeText?: string | null
  waypoints: BackendWaypoint[]
  distanceNm?: number | null
  source: string
  natTrackId?: string | null
}

interface BackendAlternative {
  id?: string | null
  routeText?: string | null
  distanceNm?: number | null
  updatedAt?: string | null
  popularity?: number | null
}

interface BackendRouteResponse {
  selectedRoute?: BackendSelectedRoute | null
  alternatives?: BackendAlternative[]
  warning?: string | null
}

// ── Haversine helper (NM) ──────────────────────────────────────────────────────

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Waypoint enrichment ────────────────────────────────────────────────────────

function enrichWaypoints(raw: BackendWaypoint[]): RouteWaypoint[] {
  let cumDist = 0
  return raw.map((wp, i) => {
    if (i > 0) {
      const prev = raw[i - 1]
      if (prev.lat != null && prev.lon != null && wp.lat != null && wp.lon != null) {
        cumDist += haversineNm(prev.lat, prev.lon, wp.lat, wp.lon)
      }
    }
    const altLabel =
      wp.type === 'airport'
        ? 'GND'
        : i === 1
          ? 'CLB'
          : i === raw.length - 2
            ? 'DSC'
            : 'CRZ'
    return {
      id:      wp.id,
      name:    wp.name   ?? undefined,
      lat:     wp.lat    ?? undefined,
      lon:     wp.lon    ?? undefined,
      type:    wp.type   ?? undefined,
      airway:  wp.airway ?? undefined,
      altLabel,
      distCum: Math.round(cumDist),
    }
  })
}

// ── Mapping ────────────────────────────────────────────────────────────────────

function mapSelectedRoute(
  dto: BackendSelectedRoute,
  aircraftProfile?: { icaoCode?: string; preferredCruiseAltitudeFt?: number; [k: string]: unknown },
): SelectedRoute {
  const enriched = enrichWaypoints(dto.waypoints ?? [])
  const totalNm  = enriched[enriched.length - 1]?.distCum ?? dto.distanceNm ?? undefined

  const altFt  = dto.cruisingAltitude ?? (aircraftProfile?.preferredCruiseAltitudeFt as number | undefined)
  const altStr = altFt ? `FL${Math.round(altFt / 100)}` : 'IFR'

  let etaMinutes: number | undefined
  let fuelEstimateTons: number | undefined
  if (aircraftProfile && totalNm) {
    const speedKts = aircraftProfile.cruiseSpeedKts as number | undefined
    const fuelRate = aircraftProfile.fuelBurnTonPerHour as number | undefined
    if (speedKts) {
      etaMinutes = Math.round((totalNm / speedKts) * 60)
      if (fuelRate) fuelEstimateTons = Number(((etaMinutes / 60) * fuelRate).toFixed(1))
    }
  }

  return {
    id:              dto.id,
    departure:       dto.departure,
    destination:     dto.destination,
    aircraftType:    dto.aircraftType,
    cruisingAltitude:dto.cruisingAltitude,
    routeType:       'IFR',
    routeText:       dto.routeText,
    waypoints:       enriched,
    distanceNm:      dto.distanceNm ?? undefined,
    source:          (dto.source as 'flight-plan-database' | 'navdata-airac2012' | 'local-fallback') ?? 'flight-plan-database',
    // Legacy compat
    altitude:        altStr,
    aircraft:        dto.aircraftType ?? (aircraftProfile?.icaoCode as string | undefined),
    airway:          dto.routeText ?? undefined,
    routeDistanceNm: totalNm,
    etaMinutes,
    fuelEstimateTons,
    aircraftProfile,
    natTrackId: dto.natTrackId ?? undefined,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fetches an IFR route from the active FlightPlanner backend.
 *
 * @throws RouteServiceError with kind 'config_error' when the backend API key is missing
 * @throws RouteServiceError with kind 'not_found' when no route exists
 * @throws RouteServiceError with kind 'external_api_failure' on upstream errors
 * @throws RouteServiceError with kind 'network' on network failure
 */
export async function fetchRoute(
  params: FetchRouteParams,
  aircraftProfile?: unknown,
  signal?: AbortSignal,
): Promise<RouteResult> {
  const qs = new URLSearchParams({
    departure:   params.departure,
    destination: params.destination,
    routeType:   params.routeType ?? 'IFR',
    ...(params.aircraftType     ? { aircraftType:    params.aircraftType }              : {}),
    ...(params.cruisingAltitude ? { cruisingAltitude:String(params.cruisingAltitude) } : {}),
    ...(params.departureLat  != null ? { departureLat:   String(params.departureLat)  } : {}),
    ...(params.departureLon  != null ? { departureLon:   String(params.departureLon)  } : {}),
    ...(params.destinationLat != null ? { destinationLat: String(params.destinationLat) } : {}),
    ...(params.destinationLon != null ? { destinationLon: String(params.destinationLon) } : {}),
  })

  let raw: BackendRouteResponse
  try {
    raw = await apiClient.get<BackendRouteResponse>(`/api/routes?${qs.toString()}`, signal)
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error

    if (error instanceof ApiClientError) {
      // 503 + "configuration_error" → hard config error
      if (error.status === 503 && error.message.toLowerCase().includes('api key')) {
        throw new RouteServiceError('config_error', error.message, error.status)
      }
      if (error.status === 503) {
        // Could be config error — check message
        if (error.message.toLowerCase().includes('configuration') || error.message.toLowerCase().includes('not configured')) {
          throw new RouteServiceError('config_error', error.message, error.status)
        }
        throw new RouteServiceError('external_api_failure', error.message, error.status)
      }
      if (error.status === 404) throw new RouteServiceError('not_found', error.message, error.status)
      if (error.status === 400) throw new RouteServiceError('invalid_params', error.message, error.status)
      if (error.status === 502) throw new RouteServiceError('external_api_failure', error.message, error.status)
      throw new RouteServiceError('external_api_failure', error.message, error.status)
    }

    if (error instanceof TypeError) {
      throw new RouteServiceError('network', 'Unable to reach the FlightPlanner backend (network error).')
    }

    throw new RouteServiceError('network', 'An unexpected error occurred while fetching the route.')
  }

  if (!raw.selectedRoute) {
    throw new RouteServiceError('not_found', raw.warning ?? 'No route data was returned by the server.')
  }

  const profile = aircraftProfile as Parameters<typeof mapSelectedRoute>[1]
  const selectedRoute = mapSelectedRoute(raw.selectedRoute, profile)

  return {
    selectedRoute,
    alternatives: raw.alternatives ?? [],
    warning:      raw.warning ?? undefined,
  }
}

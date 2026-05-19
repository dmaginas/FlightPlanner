/**
 * flightPlanDatabaseService.ts — Server-side Flight Plan Database API client.
 *
 * API documentation: https://flightplandatabase.com/dev/api
 *
 * Strategy:
 *   1. GET /search/plans?fromICAO=X&toICAO=Y&limit=5&sort=popularity
 *      → metadata list (no full waypoints)
 *   2. GET /plan/{id} for the top result → full route.nodes
 *   3. Remaining results become alternatives (metadata only)
 *
 * Aircraft type and cruising altitude are NOT supported query parameters on the
 * FPD API and are therefore NOT forwarded. They are used locally for enrichment.
 *
 * Results are cached in memory (simple Map) for the configured TTL.
 * The cache is intentionally lost on process restart.
 */

import { FPD_API_KEY, FPD_BASE_URL, FPD_CACHE_TTL_MINUTES } from '../config/env'
import { log } from '../utils/logger'

// ── Error types ────────────────────────────────────────────────────────────────

export type FpdErrorKind = 'configuration_missing' | 'http' | 'network' | 'no_results'

export class FlightPlanDatabaseError extends Error {
  public readonly kind: FpdErrorKind
  public readonly status?: number

  constructor(kind: FpdErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'FlightPlanDatabaseError'
    this.kind = kind
    this.status = status
  }
}

// ── Result types ───────────────────────────────────────────────────────────────

export interface FpdNode {
  type: string    // APT, FIX, VOR, NDB
  ident: string
  name: string | null
  lat: number
  lon: number
}

export interface FpdPlan {
  id: number
  fromIcao: string
  toIcao: string
  distanceNm: number
  maxAltitude: number
  notes: string | null
  updatedAt: string | null
  popularity: number
  nodes: FpdNode[]
}

export interface FpdPlanSummary {
  id: number
  distanceNm: number
  notes: string | null
  updatedAt: string | null
  popularity: number
}

export interface FpdRouteResult {
  selected: FpdPlan
  alternatives: FpdPlanSummary[]
}

// ── Simple in-memory cache ─────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<FpdRouteResult>>()

function getCached(key: string): FpdRouteResult | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.value
}

function setCached(key: string, value: FpdRouteResult): void {
  const ttlMs = Math.max(1, FPD_CACHE_TTL_MINUTES) * 60 * 1000
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

// ── HTTP helper ────────────────────────────────────────────────────────────────

async function callFpdApi<T>(url: string): Promise<T> {
  if (!FPD_API_KEY) {
    throw new FlightPlanDatabaseError(
      'configuration_missing',
      'FLIGHT_PLAN_DATABASE_API_KEY is not configured on this server.',
    )
  }

  const credential = Buffer.from(`${FPD_API_KEY}:`).toString('base64')

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credential}`,
        Accept: 'application/json',
        'User-Agent': 'FlightPlanner/0.1.0',
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    log('ERROR', `FPD network error for ${url}: ${msg}`)
    throw new FlightPlanDatabaseError('network', 'Unable to reach Flight Plan Database (network error).')
  }

  if (!response.ok) {
    log('WARN', `FPD HTTP ${response.status} for ${url}`)
    throw new FlightPlanDatabaseError('http', `Flight Plan Database returned HTTP ${response.status}.`, response.status)
  }

  return (await response.json()) as T
}

// ── FPD API raw types ──────────────────────────────────────────────────────────

interface FpdApiPlan {
  id: number
  fromICAO?: string
  toICAO?: string
  distance?: number
  maxAltitude?: number
  notes?: string | null
  updatedAt?: string | null
  popularity?: number
  route?: {
    nodes?: Array<{
      type?: string
      ident?: string
      name?: string | null
      lat?: number
      lon?: number
    }>
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Searches for IFR flight plans between two airports.
 * Returns the best match with full waypoints plus alternative summaries.
 */
export async function searchRoutes(departure: string, destination: string): Promise<FpdRouteResult> {
  // Check config first (before cache)
  if (!FPD_API_KEY) {
    throw new FlightPlanDatabaseError(
      'configuration_missing',
      'FLIGHT_PLAN_DATABASE_API_KEY is not configured on this server.',
    )
  }

  const cacheKey = `fpd:${departure.toUpperCase()}:${destination.toUpperCase()}:IFR`
  const cached = getCached(cacheKey)
  if (cached) {
    log('INFO', `FPD cache hit for ${departure}-${destination}`)
    return cached
  }

  // Step 1: Search for plans
  const searchUrl =
    `${FPD_BASE_URL}/search/plans` +
    `?fromICAO=${encodeURIComponent(departure)}` +
    `&toICAO=${encodeURIComponent(destination)}` +
    `&limit=5&sort=popularity`

  log('INFO', `FPD search: ${departure} → ${destination}`)
  const summaries = await callFpdApi<FpdApiPlan[]>(searchUrl)

  if (!summaries || summaries.length === 0) {
    throw new FlightPlanDatabaseError('no_results', `No IFR flight plans found between ${departure} and ${destination}.`)
  }

  // Step 2: Fetch full plan for top result
  const topId = summaries[0].id
  log('INFO', `FPD fetching full plan ${topId}`)
  const fullPlan = await callFpdApi<FpdApiPlan>(`${FPD_BASE_URL}/plan/${topId}`)

  if (!fullPlan.route?.nodes || fullPlan.route.nodes.length === 0) {
    throw new FlightPlanDatabaseError('no_results', `Flight plan ${topId} returned no waypoints.`)
  }

  // Step 3: Map to internal model
  const selected: FpdPlan = {
    id: fullPlan.id,
    fromIcao: fullPlan.fromICAO ?? departure,
    toIcao: fullPlan.toICAO ?? destination,
    distanceNm: fullPlan.distance ?? 0,
    maxAltitude: fullPlan.maxAltitude ?? 0,
    notes: fullPlan.notes ?? null,
    updatedAt: fullPlan.updatedAt ?? null,
    popularity: fullPlan.popularity ?? 0,
    nodes: fullPlan.route.nodes.map((n) => ({
      type: n.type ?? '',
      ident: n.ident ?? '',
      name: n.name ?? null,
      lat: n.lat ?? 0,
      lon: n.lon ?? 0,
    })),
  }

  const alternatives: FpdPlanSummary[] = summaries.slice(1).map((s) => ({
    id: s.id,
    distanceNm: s.distance ?? 0,
    notes: s.notes ?? null,
    updatedAt: s.updatedAt ?? null,
    popularity: s.popularity ?? 0,
  }))

  const result: FpdRouteResult = { selected, alternatives }
  setCached(cacheKey, result)

  log('INFO', `FPD found ${summaries.length} plan(s) for ${departure}-${destination}, top id=${topId}`)
  return result
}

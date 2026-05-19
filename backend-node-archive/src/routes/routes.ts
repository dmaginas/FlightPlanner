/**
 * routes.ts — GET /api/routes?departure=EDDF&destination=EGLL&aircraftType=A320&cruisingAltitude=35000
 *
 * Proxies route requests to the Flight Plan Database API, caches results
 * server-side (default 30 min), and maps the response into a stable
 * frontend-facing JSON structure identical to the ASP.NET backend.
 *
 * Aircraft type and cruising altitude are accepted for client-side enrichment
 * and future extensibility but are NOT forwarded to the FPD API (not supported).
 */

import { Router, Request, Response } from 'express'
import { normalizeAndValidateIcao } from '../utils/validation'
import { searchRoutes, FlightPlanDatabaseError, FpdNode } from '../services/flightPlanDatabaseService'
import { log } from '../utils/logger'

const router = Router()

const ICAO_RE = /^[A-Z0-9]{4}$/

function validIcao(raw: string | undefined): string | null {
  const code = raw?.trim().toUpperCase() ?? ''
  return ICAO_RE.test(code) ? code : null
}

function normaliseNodeType(fpdType: string): string {
  switch (fpdType.toUpperCase()) {
    case 'APT': return 'airport'
    case 'VOR': return 'vor'
    case 'NDB': return 'ndb'
    default:    return 'fix'
  }
}

router.get('/routes', async (req: Request, res: Response): Promise<void> => {
  // ── Parameter validation ────────────────────────────────────────────────────
  const dep = validIcao(req.query['departure'] as string | undefined)
  const arr = validIcao(req.query['destination'] as string | undefined)
  const aircraftType     = (req.query['aircraftType']     as string | undefined)?.trim() || undefined
  const cruisingAltitude = parseInt(req.query['cruisingAltitude'] as string ?? '', 10) || undefined
  const routeType        = ((req.query['routeType'] as string | undefined) ?? 'IFR').toUpperCase()

  if (!dep) {
    res.status(400).json({
      error: 'Invalid departure ICAO.',
      details: 'departure must be exactly 4 alphanumeric characters (e.g. EDDF).',
    })
    return
  }

  if (!arr) {
    res.status(400).json({
      error: 'Invalid destination ICAO.',
      details: 'destination must be exactly 4 alphanumeric characters (e.g. EGLL).',
    })
    return
  }

  if (dep === arr) {
    res.status(400).json({
      error: 'departure and destination must be different airports.',
      details: 'departure and destination cannot be the same ICAO code.',
    })
    return
  }

  if (routeType !== 'IFR') {
    res.status(400).json({
      error: 'Unsupported route type.',
      details: 'Only routeType=IFR is currently supported.',
    })
    return
  }

  // ── Search via FPD service ──────────────────────────────────────────────────
  try {
    const result = await searchRoutes(dep, arr)
    const plan = result.selected

    // Build route text from notes or waypoint idents
    let routeText: string | null = plan.notes?.trim() || null
    if (!routeText) {
      routeText = plan.nodes
        .filter((n) => n.type.toUpperCase() !== 'APT')
        .map((n) => n.ident)
        .filter(Boolean)
        .join(' ')
    }

    // Altitude string from maxAltitude field
    const altString =
      plan.maxAltitude > 0
        ? `FL${Math.round(plan.maxAltitude / 100)}`
        : cruisingAltitude
          ? `FL${Math.round(cruisingAltitude / 100)}`
          : 'IFR'

    const waypoints = plan.nodes.map((n: FpdNode) => ({
      id:   n.ident,
      name: n.name,
      lat:  n.lat,
      lon:  n.lon,
      type: normaliseNodeType(n.type),
    }))

    const response = {
      selectedRoute: {
        id:              String(plan.id),
        departure:       dep,
        destination:     arr,
        aircraftType:    aircraftType ?? null,
        cruisingAltitude:cruisingAltitude ?? null,
        routeType:       'IFR',
        routeText:       routeText || null,
        waypoints,
        distanceNm:      plan.distanceNm,
        source:          'flight-plan-database',
      },
      alternatives: result.alternatives.map((a) => ({
        id:         String(a.id),
        routeText:  a.notes?.trim() || null,
        distanceNm: a.distanceNm,
        updatedAt:  a.updatedAt,
        popularity: a.popularity,
      })),
      warning: null,
    }

    res.status(200).json(response)
  } catch (err) {
    if (err instanceof FlightPlanDatabaseError) {
      if (err.kind === 'configuration_missing') {
        log('ERROR', `FPD config error: ${err.message}`)
        res.status(503).json({
          error: 'configuration_error',
          details: 'The Flight Plan Database API key is not configured on this server. Please contact your system administrator.',
        })
        return
      }
      if (err.kind === 'no_results') {
        log('INFO', `FPD no results for ${dep}-${arr}: ${err.message}`)
        res.status(404).json({ error: 'No routes found.', details: err.message })
        return
      }
      if (err.kind === 'http') {
        log('WARN', `FPD upstream error for ${dep}-${arr}: ${err.message}`)
        res.status(502).json({ error: 'Upstream error.', details: 'The Flight Plan Database returned an error. Please try again later.' })
        return
      }
      if (err.kind === 'network') {
        log('ERROR', `FPD network error for ${dep}-${arr}: ${err.message}`)
        res.status(503).json({ error: 'Service unavailable.', details: 'Unable to reach the Flight Plan Database. Please try again later.' })
        return
      }
    }
    log('ERROR', `Unexpected error for route ${dep}-${arr}: ${err instanceof Error ? err.message : String(err)}`)
    res.status(500).json({ error: 'Internal server error.', details: 'An unexpected error occurred.' })
  }
})

export default router

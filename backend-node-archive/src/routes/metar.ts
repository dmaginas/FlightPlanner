/**
 * metar.ts — GET /api/metar?icao=<ICAO>
 *
 * Proxies METAR requests to AviationWeather server-side.
 * This eliminates the browser CORS restriction that blocks direct
 * browser-to-AviationWeather requests.
 *
 * Query parameters:
 *   icao (required) — ICAO airport code, e.g. EDDF
 *
 * Success response (200):
 *   Content-Type: text/plain
 *   Body: raw METAR string, e.g. "EDDF 181120Z 26005KT ..."
 *
 * Error responses:
 *   400  — missing or invalid ICAO code
 *   502  — upstream AviationWeather HTTP error
 *   503  — network/connection error reaching AviationWeather
 *   404  — no METAR available for this airport
 */

import { Router, Request, Response } from 'express'
import { normalizeAndValidateIcao } from '../utils/validation'
import { fetchRawMetar, AviationWeatherServiceError } from '../services/aviationWeatherService'
import { log } from '../utils/logger'

const router = Router()

router.get('/metar', async (req: Request, res: Response): Promise<void> => {
  const rawIcao = req.query['icao'] as string | undefined
  const icao = normalizeAndValidateIcao(rawIcao)

  if (!icao) {
    res.status(400).json({
      error: 'invalid_icao',
      message: 'Query parameter "icao" must be exactly 4 alphanumeric characters (e.g. EDDF).',
    })
    return
  }

  try {
    const metar = await fetchRawMetar(icao)
    res.type('text/plain').send(metar)
  } catch (err) {
    if (err instanceof AviationWeatherServiceError) {
      if (err.kind === 'empty_response') {
        res.status(404).json({ error: 'not_found', message: err.message })
        return
      }
      if (err.kind === 'http') {
        log('WARN', `Upstream error for ${icao}: ${err.message}`)
        res.status(502).json({ error: 'upstream_error', message: err.message })
        return
      }
      if (err.kind === 'network') {
        log('ERROR', `Network error for ${icao}: ${err.message}`)
        res.status(503).json({ error: 'service_unavailable', message: err.message })
        return
      }
    }

    // Unexpected error
    log('ERROR', `Unexpected error for METAR ${icao}: ${err instanceof Error ? err.message : String(err)}`)
    res.status(500).json({ error: 'internal_error', message: 'An unexpected error occurred.' })
  }
})

export default router

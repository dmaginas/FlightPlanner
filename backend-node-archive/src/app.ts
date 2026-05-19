/**
 * app.ts — Express application factory.
 *
 * Exported separately from server.ts so it can be imported in tests
 * without binding to a port.
 */

import express, { Express } from 'express'
import cors from 'cors'
import { ALLOWED_ORIGINS, FRONTEND_DIST_PATH } from './config/env'
import { requestLogger } from './utils/logger'
import healthRouter from './routes/health'
import metarRouter from './routes/metar'
import routesRouter from './routes/routes'

export function createApp(): Express {
  const app = express()

  // ── Middleware ─────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: ALLOWED_ORIGINS,
      methods: ['GET'],
    }),
  )
  app.use(express.json())
  app.use(requestLogger)

  // ── API routes ─────────────────────────────────────────────
  app.use('/api', healthRouter)
  app.use('/api', metarRouter)
  app.use('/api', routesRouter)

  // ── Static frontend (production) ───────────────────────────────────────────
  // Serve the built Vite output so a single Node process handles both API and UI.
  app.use(express.static(FRONTEND_DIST_PATH))

  // SPA fallback: non-API routes return index.html for client-side routing.
  app.get(/^(?!\/api).*$/, (_req, res) => {
    res.sendFile(`${FRONTEND_DIST_PATH}/index.html`)
  })

  return app
}

/**
 * health.ts — GET /api/health
 *
 * Returns the backend service status, name, and version.
 * Version is read from package.json to avoid duplication.
 */

import { Router, Request, Response } from 'express'
// resolveJsonModule is enabled in tsconfig — this import is type-safe
import pkg from '../../package.json'

const router = Router()

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    name: 'FlightPlanner Backend',
    version: pkg.version,
  })
})

export default router

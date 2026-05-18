/**
 * server.ts — Entry point. Loads .env, creates the Express app, and binds to PORT.
 *
 * .env is loaded here (before any other imports that read process.env) so that
 * config/env.ts always sees the populated environment.
 */

import path from 'path'
// Load .env from the backend directory before anything else
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

import { PORT } from './config/env'
import { createApp } from './app'
import { log } from './utils/logger'

const app = createApp()

app.listen(PORT, () => {
  log('INFO', `FlightPlanner Backend listening on http://localhost:${PORT}`)
  log('INFO', `Health: http://localhost:${PORT}/api/health`)
  log('INFO', `METAR:  http://localhost:${PORT}/api/metar?icao=EDDF`)
})

/**
 * env.ts — Reads and validates environment variables.
 *
 * All configuration is read once at startup. Missing optional variables
 * fall back to safe defaults. PORT and ALLOWED_ORIGINS can be overridden
 * via a .env file loaded by server.ts before this module is imported.
 */

export const PORT: number = parseInt(process.env['PORT'] ?? '3001', 10)

/**
 * Comma-separated list of origins allowed by the CORS middleware.
 * Example: http://localhost:5173,https://flightplanner.example.com
 */
export const ALLOWED_ORIGINS: string[] = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

/**
 * Absolute path to the built frontend assets.
 * In production, the backend serves these as static files.
 *
 * Directory layout after build:
 *   backend/dist/config/env.js  ← __dirname
 *   backend/dist/               ← up 1
 *   backend/                    ← up 2
 *   <repo-root>/                ← up 3
 *   <repo-root>/frontend/dist/  ← target
 */
import path from 'path'
export const FRONTEND_DIST_PATH: string = path.resolve(__dirname, '..', '..', '..', 'frontend', 'dist')

// ── Flight Plan Database API ───────────────────────────────────────────────────

/**
 * Flight Plan Database API key (required at request time — no default).
 * Set in .env: FLIGHT_PLAN_DATABASE_API_KEY=your_key_here
 * Never commit a real key; keep it in .env (listed in .gitignore).
 */
export const FPD_API_KEY: string = process.env['FLIGHT_PLAN_DATABASE_API_KEY'] ?? ''

/** Base URL for the Flight Plan Database API. */
export const FPD_BASE_URL: string = (
  process.env['FLIGHT_PLAN_DATABASE_BASE_URL'] ?? 'https://api.flightplandatabase.com'
).replace(/\/$/, '')

/** Server-side in-memory cache TTL in minutes. Default: 30. */
export const FPD_CACHE_TTL_MINUTES: number = parseInt(
  process.env['FLIGHT_PLAN_DATABASE_CACHE_TTL_MINUTES'] ?? '30',
  10,
)

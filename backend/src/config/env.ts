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


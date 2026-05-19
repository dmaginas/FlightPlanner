/**
 * apiConfig.ts — Central backend configuration for the FlightPlanner frontend.
 *
 * The active backend is selected at build/start time via the VITE_API_BACKEND
 * environment variable. There is no runtime UI switch.
 *
 * Supported values for VITE_API_BACKEND:
 *   node   — Old Node.js/TypeScript backend (backend-node-archive)
 *   aspnet — New C#/ASP.NET Core backend (backend)
 *
 * Configuration is validated eagerly. A clear error is thrown if the variable
 * is missing or contains an unsupported value, so misconfiguration is caught
 * at startup rather than at the point of the first API call.
 *
 * Usage:
 *   import { apiConfig } from './config/apiConfig'
 *   const url = `${apiConfig.baseUrl}/api/metar?icao=${icao}`
 */

/** The two supported FlightPlanner backend implementations. */
export type ApiBackend = 'node' | 'aspnet'

const ACCEPTED_BACKENDS: ReadonlySet<string> = new Set<ApiBackend>(['node', 'aspnet'])

// ── Read env variables ────────────────────────────────────────────────────────

const rawBackend = import.meta.env['VITE_API_BACKEND'] as string | undefined
const nodeBaseUrl = (import.meta.env['VITE_NODE_API_BASE_URL'] as string | undefined)?.replace(/\/$/, '')
const aspNetBaseUrl = (
  (import.meta.env['VITE_ASPNET_API_BASE_URL'] as string | undefined) ??
  // Backward-compat fallback: honour the legacy VITE_API_BASE_URL variable
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined)
)?.replace(/\/$/, '')

// ── Validate backend selection ────────────────────────────────────────────────

if (!rawBackend) {
  const message =
    '[FlightPlanner] VITE_API_BACKEND is not set in your .env file.\n' +
    'Set it to "node" (Node.js/TypeScript backend) or "aspnet" (C#/ASP.NET backend).\n' +
    'See frontend/.env.example for an example.'
  console.error(message)
  throw new Error(message)
}

if (!ACCEPTED_BACKENDS.has(rawBackend)) {
  const message =
    `[FlightPlanner] VITE_API_BACKEND="${rawBackend}" is not a valid backend name.\n` +
    'Accepted values: "node" | "aspnet".\n' +
    'See frontend/.env.example for an example.'
  console.error(message)
  throw new Error(message)
}

const backend = rawBackend as ApiBackend

// ── Resolve the active base URL ───────────────────────────────────────────────

function resolveBaseUrl(activeBackend: ApiBackend): string {
  if (activeBackend === 'node') {
    const url = nodeBaseUrl ?? 'http://localhost:3001'
    if (!nodeBaseUrl) {
      console.warn(
        '[FlightPlanner] VITE_NODE_API_BASE_URL is not set. ' +
        'Falling back to "http://localhost:3001".',
      )
    }
    return url
  }

  // aspnet
  const url = aspNetBaseUrl ?? 'https://localhost:5001'
  if (!aspNetBaseUrl) {
    console.warn(
      '[FlightPlanner] Neither VITE_ASPNET_API_BASE_URL nor VITE_API_BASE_URL is set. ' +
      'Falling back to "https://localhost:5001".',
    )
  }
  return url
}

// ── Exported configuration object ────────────────────────────────────────────

/**
 * The active API configuration resolved from environment variables.
 *
 * @example
 * import { apiConfig } from '@/config/apiConfig'
 * console.log(apiConfig.backend)  // 'node' | 'aspnet'
 * console.log(apiConfig.baseUrl)  // 'https://localhost:5001'
 */
export const apiConfig = Object.freeze({
  /** The active backend identifier: 'node' or 'aspnet'. */
  backend,

  /**
   * The base URL of the active backend, without a trailing slash.
   * Derived from the corresponding VITE_*_API_BASE_URL variable.
   */
  baseUrl: resolveBaseUrl(backend),
} satisfies { backend: ApiBackend; baseUrl: string })

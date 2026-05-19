/**
 * apiClient.ts — Thin, generic HTTP client for the FlightPlanner frontend.
 *
 * Wraps native `fetch` with:
 *   - Automatic base URL from apiConfig
 *   - Content-type–aware response parsing (JSON and text/plain)
 *   - Normalised HTTP error handling via ApiClientError
 *   - AbortSignal support for request cancellation
 *
 * This module contains NO FlightPlanner business logic. Domain-specific
 * API calls belong in the services layer (e.g. metarService.ts).
 *
 * Extending for auth:
 *   Add an Authorization header in the `buildHeaders` helper below.
 *
 * Usage:
 *   const text = await apiClient.get<string>('/api/metar?icao=EDDF', signal)
 *   const data = await apiClient.post<MyType>('/api/endpoint', { key: 'val' })
 */

import { apiConfig } from '../config/apiConfig'

// ── Error type ────────────────────────────────────────────────────────────────

/** Structured error thrown by the API client on HTTP failures. */
export class ApiClientError extends Error {
  /** HTTP status code returned by the server. */
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function buildHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  // Add auth headers here when authentication is introduced, e.g.:
  //   headers.set('Authorization', `Bearer ${getToken()}`)
  return headers
}

function buildUrl(path: string): string {
  // path must start with '/' — the base URL never has a trailing slash.
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${apiConfig.baseUrl}${normalizedPath}`
}

/**
 * Parses a Response into the expected type T.
 * Returns the plain text string for text/* content types,
 * parses JSON for application/json (and similar), otherwise returns the raw text.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  // text/plain, text/html, or no content-type — return raw text
  return (await response.text()) as unknown as T
}

/**
 * Attempts to extract a human-readable message from an error response body.
 * Supports the FlightPlanner JSON error shape: { error, details } or { error, message }.
 */
async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const clone = response.clone()
    const contentType = clone.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = (await clone.json()) as { error?: string; details?: string; message?: string }
      return body?.details ?? body?.message ?? body?.error ?? fallback
    }
    const text = (await clone.text()).trim()
    return text || fallback
  } catch {
    return fallback
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const apiClient = {
  /**
   * Performs a GET request against the active FlightPlanner backend.
   *
   * @param path - Relative API path, e.g. '/api/metar?icao=EDDF'
   * @param signal - Optional AbortSignal for cancellation
   * @returns Parsed response body as T
   * @throws ApiClientError on HTTP error (non-2xx status)
   * @throws DOMException (AbortError) if the request is cancelled
   * @throws TypeError on network failure
   */
  async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    const url = buildUrl(path)
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders({ Accept: 'application/json, text/plain, */*' }),
      signal,
    })

    if (!response.ok) {
      const message = await extractErrorMessage(
        response,
        `GET ${path} failed with status ${response.status}.`,
      )
      throw new ApiClientError(response.status, message)
    }

    return parseResponse<T>(response)
  },

  /**
   * Performs a POST request against the active FlightPlanner backend.
   *
   * @param path - Relative API path, e.g. '/api/flights'
   * @param body - Request body, serialised to JSON
   * @param signal - Optional AbortSignal for cancellation
   * @returns Parsed response body as T
   * @throws ApiClientError on HTTP error (non-2xx status)
   */
  async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const url = buildUrl(path)
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const message = await extractErrorMessage(
        response,
        `POST ${path} failed with status ${response.status}.`,
      )
      throw new ApiClientError(response.status, message)
    }

    return parseResponse<T>(response)
  },
}

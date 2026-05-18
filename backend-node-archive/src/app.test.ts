/**
 * app.test.ts — Integration tests for the FlightPlanner backend.
 *
 * Test framework: Vitest (fast, TypeScript-native, Jest-compatible API)
 * HTTP testing:   supertest (in-process HTTP requests, no real port binding)
 *
 * AviationWeather is mocked in all tests — no real network calls are made.
 * METAR data is only mocked here in tests, never in production code.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'

// ── Mock: AviationWeather fetch ──────────────────────────────────────────────
// We mock the global `fetch` so no real AviationWeather requests happen in tests.
// METAR data is only mocked here — production code always calls the real endpoint.

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeAviationWeatherResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  })
}

// ── Mock: frontend/dist ───────────────────────────────────────────────────────
// The backend tries to serve frontend/dist as static files.
// In the test environment we mock the env module to point to a non-existent path
// so Express just skips static serving gracefully.

vi.mock('../src/config/env', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/config/env')>()
  return {
    ...original,
    // Use a path that does not exist — express.static silently skips missing dirs
    FRONTEND_DIST_PATH: '/tmp/__nonexistent_frontend_dist_for_tests__',
  }
})

// ── App under test ────────────────────────────────────────────────────────────
const app = createApp()

describe('GET /api/health', () => {
  it('returns status ok with name and version', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.name).toBe('FlightPlanner Backend')
    expect(typeof res.body.version).toBe('string')
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('reads version from package.json (0.1.0)', async () => {
    const res = await request(app).get('/api/health')
    expect(res.body.version).toBe('0.1.0')
  })
})

describe('GET /api/metar — ICAO validation', () => {
  it('returns 400 for missing icao parameter', async () => {
    const res = await request(app).get('/api/metar')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_icao')
  })

  it('returns 400 for ICAO shorter than 4 characters', async () => {
    const res = await request(app).get('/api/metar?icao=EDD')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_icao')
  })

  it('returns 400 for ICAO longer than 4 characters', async () => {
    const res = await request(app).get('/api/metar?icao=EDDFX')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_icao')
  })

  it('returns 400 for ICAO with special characters', async () => {
    const res = await request(app).get('/api/metar?icao=ED-F')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_icao')
  })

  it('returns 400 for empty icao parameter', async () => {
    const res = await request(app).get('/api/metar?icao=')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_icao')
  })
})

describe('GET /api/metar — successful METAR fetch', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(
      makeAviationWeatherResponse('EDDF 181120Z 26005KT CAVOK 15/07 Q1013 NOSIG'),
    )
  })

  afterEach(() => {
    mockFetch.mockReset()
  })

  it('returns 200 with raw METAR text for a valid ICAO', async () => {
    const res = await request(app).get('/api/metar?icao=EDDF')
    expect(res.status).toBe(200)
    expect(res.text).toBe('EDDF 181120Z 26005KT CAVOK 15/07 Q1013 NOSIG')
  })

  it('normalises lowercase icao to uppercase before calling AviationWeather', async () => {
    const res = await request(app).get('/api/metar?icao=eddf')
    expect(res.status).toBe(200)
    // Verify AviationWeather was called with uppercase ICAO
    const calledUrl: string = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('ids=EDDF')
  })

  it('trims whitespace from icao before calling AviationWeather', async () => {
    const res = await request(app).get('/api/metar?icao=%20EDDF%20')
    expect(res.status).toBe(200)
    const calledUrl: string = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('ids=EDDF')
  })

  it('calls AviationWeather with format=raw', async () => {
    await request(app).get('/api/metar?icao=EDDF')
    const calledUrl: string = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('format=raw')
  })

  it('returns plain text content type', async () => {
    const res = await request(app).get('/api/metar?icao=EDDF')
    expect(res.headers['content-type']).toMatch(/text\/plain/)
  })

  it('accepts alphanumeric ICAO codes (digits allowed)', async () => {
    mockFetch.mockResolvedValue(makeAviationWeatherResponse('K1L0 181120Z AUTO 00000KT M10/M12'))
    const res = await request(app).get('/api/metar?icao=K1L0')
    expect(res.status).toBe(200)
  })
})

describe('GET /api/metar — empty AviationWeather response', () => {
  afterEach(() => mockFetch.mockReset())

  it('returns 404 when AviationWeather returns an empty body', async () => {
    mockFetch.mockResolvedValue(makeAviationWeatherResponse(''))
    const res = await request(app).get('/api/metar?icao=EDDF')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('not_found')
  })

  it('returns 404 when AviationWeather returns only whitespace', async () => {
    mockFetch.mockResolvedValue(makeAviationWeatherResponse('   \n  \n  '))
    const res = await request(app).get('/api/metar?icao=EDDF')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('not_found')
  })
})

describe('GET /api/metar — AviationWeather HTTP errors', () => {
  afterEach(() => mockFetch.mockReset())

  it('returns 502 when AviationWeather returns HTTP 500', async () => {
    mockFetch.mockResolvedValue(makeAviationWeatherResponse('Internal Server Error', 500))
    const res = await request(app).get('/api/metar?icao=EDDF')
    expect(res.status).toBe(502)
    expect(res.body.error).toBe('upstream_error')
  })

  it('returns 502 when AviationWeather returns HTTP 503', async () => {
    mockFetch.mockResolvedValue(makeAviationWeatherResponse('Service Unavailable', 503))
    const res = await request(app).get('/api/metar?icao=EDDF')
    expect(res.status).toBe(502)
    expect(res.body.error).toBe('upstream_error')
  })
})

describe('GET /api/metar — network errors', () => {
  afterEach(() => mockFetch.mockReset())

  it('returns 503 when AviationWeather is unreachable (network error)', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'))
    const res = await request(app).get('/api/metar?icao=EDDF')
    expect(res.status).toBe(503)
    expect(res.body.error).toBe('service_unavailable')
  })

  it('returns 503 when AviationWeather connection times out', async () => {
    mockFetch.mockRejectedValue(new TypeError('network timeout'))
    const res = await request(app).get('/api/metar?icao=EDDF')
    expect(res.status).toBe(503)
  })
})

describe('CORS configuration', () => {
  it('returns Access-Control-Allow-Origin for an allowed origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173')
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('does not return Access-Control-Allow-Origin for a disallowed origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://evil.example.com')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('Static frontend serving and SPA fallback', () => {
  it('returns 200 for /api/health (API routes are not affected by static serving)', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
  })

  it('SPA fallback route is hit for non-API paths (no API-format JSON 404)', async () => {
    // When frontend/dist does not exist, sendFile returns an error response.
    // We verify that the response is NOT a JSON API error — confirming the
    // SPA catch-all route is reached rather than an API 404 handler.
    const res = await request(app).get('/some/deep/client-side-route')
    // The response body should not be a JSON API error object
    expect(res.body).not.toHaveProperty('error')
  })
})

describe('Request logging', () => {
  it('does not interfere with normal request handling', async () => {
    // The logger is middleware — verify it does not break the response
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

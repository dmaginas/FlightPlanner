import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { fetchAirportDiagram, type RunwayInfo, type AirportDiagramData } from '../services/airportDiagramService'

// ── Projection helpers ────────────────────────────────────────────────────────

const SVG_SIZE = 440
const PADDING  = 44

function buildProjection(runways: RunwayInfo[]) {
  const pts = runways.flatMap(r => [
    { lat: r.leLat, lon: r.leLon },
    { lat: r.heLat, lon: r.heLon },
  ])

  const centerLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length
  const centerLon = pts.reduce((s, p) => s + p.lon, 0) / pts.length
  const R      = 6_371_000
  const cosLat = Math.cos(centerLat * Math.PI / 180)

  function toMeters(lat: number, lon: number): [number, number] {
    return [
      (lon - centerLon) * (Math.PI / 180) * R * cosLat,
      -(lat - centerLat) * (Math.PI / 180) * R,   // SVG y grows downward
    ]
  }

  const mPts = pts.map(p => toMeters(p.lat, p.lon))
  const xs   = mPts.map(p => p[0])
  const ys   = mPts.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)

  const range  = Math.max(maxX - minX, maxY - minY, 200)   // min 200 m range
  const scale  = (SVG_SIZE - 2 * PADDING) / range
  const midX   = (minX + maxX) / 2
  const midY   = (minY + maxY) / 2

  function toSvg(lat: number, lon: number): [number, number] {
    const [mx, my] = toMeters(lat, lon)
    return [
      (mx - midX) * scale + SVG_SIZE / 2,
      (my - midY) * scale + SVG_SIZE / 2,
    ]
  }

  return { toSvg, scale }
}

// ── Runway SVG ────────────────────────────────────────────────────────────────

function DiagramSvg({ runways }: { runways: RunwayInfo[] }) {
  const visible = runways.filter(r => r.leLat !== 0 || r.leLon !== 0)
  if (visible.length === 0) return null

  const { toSvg, scale } = buildProjection(visible)

  const surfaceColor = (surface: string, closed: boolean) => {
    if (closed) return { fill: '#1a1a2a', stroke: '#333' }
    const s = surface.toLowerCase()
    if (s.includes('asph') || s.includes('conc') || s.includes('bit'))
      return { fill: '#1c2a3e', stroke: '#3a5578' }
    if (s.includes('turf') || s.includes('grass') || s.includes('grvl'))
      return { fill: '#1a2a1a', stroke: '#3a5a3a' }
    return { fill: '#1e2535', stroke: '#3a5070' }
  }

  return (
    <svg
      width={SVG_SIZE} height={SVG_SIZE}
      style={{ display: 'block', background: '#080c1e' }}
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
    >
      {/* North arrow */}
      <g transform={`translate(${SVG_SIZE - 26}, 26)`}>
        <line x1={0} y1={10} x2={0} y2={-8}
          stroke="rgba(244,247,255,0.35)" strokeWidth={1.5} />
        <polygon points="0,-13 -3.5,-5 3.5,-5"
          fill="rgba(244,247,255,0.35)" />
        <text x={0} y={20} textAnchor="middle"
          fill="rgba(244,247,255,0.25)" fontSize={8} fontFamily="monospace">
          N
        </text>
      </g>

      {visible.map((rwy, i) => {
        const [x1, y1] = toSvg(rwy.leLat, rwy.leLon)
        const [x2, y2] = toSvg(rwy.heLat, rwy.heLon)

        const dx  = x2 - x1
        const dy  = y2 - y1
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const nx  = dx / len   // unit vector along runway
        const ny  = dy / len

        // Width in SVG pixels, proportional to real-world width
        const widthPx = Math.max(4, (rwy.widthFt * 0.3048) * scale)

        // Label offset: push away from runway end along the axis
        const LOFF = 13

        const { fill, stroke } = surfaceColor(rwy.surface, rwy.closed)

        return (
          <g key={i}>
            {/* Dark surround (for contrast on edges) */}
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={widthPx + 6}
              strokeLinecap="square" />
            {/* Runway fill */}
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={fill}
              strokeWidth={widthPx}
              strokeLinecap="square" />
            {/* Edge lines */}
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={stroke}
              strokeWidth={widthPx}
              strokeLinecap="square"
              fill="none"
              style={{ paintOrder: 'stroke', strokeOpacity: 0, fill: 'none' }}
            />
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={stroke}
              strokeWidth={widthPx}
              strokeLinecap="square"
              strokeOpacity={0}
            />
            {/* Outline (just the border) */}
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={stroke}
              strokeWidth={widthPx - 1}
              strokeLinecap="square"
              fill="none"
            />
            {/* Centerline */}
            {!rwy.closed && (
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(244,247,255,0.10)"
                strokeWidth={1}
                strokeDasharray="10 7"
                strokeLinecap="butt" />
            )}
            {/* LE designator */}
            <text
              x={x1 - nx * LOFF} y={y1 - ny * LOFF}
              textAnchor="middle" dominantBaseline="middle"
              fill={rwy.closed ? 'rgba(244,247,255,0.2)' : 'rgba(244,247,255,0.75)'}
              fontSize={9.5} fontFamily="monospace" fontWeight={700}
              style={{ userSelect: 'none' }}
            >
              {rwy.leIdent || '—'}
            </text>
            {/* HE designator */}
            <text
              x={x2 + nx * LOFF} y={y2 + ny * LOFF}
              textAnchor="middle" dominantBaseline="middle"
              fill={rwy.closed ? 'rgba(244,247,255,0.2)' : 'rgba(244,247,255,0.75)'}
              fontSize={9.5} fontFamily="monospace" fontWeight={700}
              style={{ userSelect: 'none' }}
            >
              {rwy.heIdent || '—'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Runway info table ─────────────────────────────────────────────────────────

function RunwayTable({ runways }: { runways: RunwayInfo[] }) {
  return (
    <div style={{ padding: '10px 20px 16px' }}>
      {runways.map((rwy, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '5px 0',
          borderBottom: i < runways.length - 1 ? '1px solid var(--line-2)' : 'none',
          opacity: rwy.closed ? 0.45 : 1,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
            color: 'var(--text)', minWidth: 64,
          }}>
            {rwy.leIdent}/{rwy.heIdent}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {rwy.lengthFt > 0 ? `${rwy.lengthFt.toLocaleString()} ft` : '—'}
          </span>
          {rwy.widthFt > 0 && (
            <span style={{ fontSize: 11, color: 'var(--dim)' }}>
              × {rwy.widthFt} ft
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--dim)', marginLeft: 'auto' }}>
            {rwy.surface}
            {rwy.lighted ? ' · lit' : ''}
            {rwy.closed  ? ' · CLOSED' : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function AirportDiagramModal({
  icao,
  airportName,
  onClose,
}: {
  icao:         string
  airportName?: string
  onClose:      () => void
}) {
  const [data,    setData]    = useState<AirportDiagramData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    setData(null)

    fetchAirportDiagram(icao, ctrl.signal)
      .then(d  => { setData(d);  setLoading(false) })
      .catch(e => {
        if (e?.name === 'AbortError') return
        setError('No runway data available for this airport.')
        setLoading(false)
      })

    return () => ctrl.abort()
  }, [icao])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(0,0,0,0.70)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          overflow: 'hidden',
          width: Math.min(SVG_SIZE, window.innerWidth - 32),
          boxShadow: '0 32px 80px rgba(0,0,0,.85)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--line-2)',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700,
              color: 'var(--text)', letterSpacing: '0.05em',
            }}>
              {icao}
            </div>
            {airportName && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                {airportName}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--glass-2)', border: '1px solid var(--line-2)',
              borderRadius: 8, padding: '5px 10px',
              fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {loading && (
          <div style={{ padding: 52, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '3px solid var(--line)', borderTopColor: 'var(--violet)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 14px',
            }} />
            Loading runway data…
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            <DiagramSvg runways={data.runways} />
            <div style={{ borderTop: '1px solid var(--line-2)' }}>
              <RunwayTable runways={data.runways} />
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>,
    document.body,
  )
}

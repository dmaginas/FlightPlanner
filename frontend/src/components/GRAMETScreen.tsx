import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchGramet } from '../services/grametService.ts'
import type { GrametData, GrametWaypointData } from '../services/grametService.ts'
import type { SelectedRoute } from '../services/routeService.ts'

// ── Chart constants ───────────────────────────────────────────────────────────

const LEVELS = [
  { pressureHPa: 200, label: 'FL390' },
  { pressureHPa: 250, label: 'FL340' },
  { pressureHPa: 300, label: 'FL300' },
  { pressureHPa: 500, label: 'FL180' },
  { pressureHPa: 700, label: 'FL100' },
  { pressureHPa: 850, label: 'FL050' },
]

const MARGIN   = { top: 24, right: 28, bottom: 68, left: 72 }
const CELL_H   = 54
const CELL_W   = 90
const MAX_WPS  = 12

const WIND_LEGEND = [
  { label: '< 15 kt — Calm',      color: 'rgba(139,124,255,0.22)' },
  { label: '15–30 kt — Light',    color: 'rgba(139,124,255,0.45)' },
  { label: '30–50 kt — Moderate', color: 'rgba(139,124,255,0.75)' },
  { label: '50–80 kt — Strong',   color: 'rgba(255,196,87,0.80)'  },
  { label: '> 80 kt — Jet',       color: 'rgba(233,69,96,0.85)'   },
]

function windColor(kts: number): string {
  if (kts < 15) return 'rgba(139,124,255,0.08)'
  if (kts < 30) return 'rgba(139,124,255,0.28)'
  if (kts < 50) return 'rgba(139,124,255,0.55)'
  if (kts < 80) return 'rgba(255,196,87,0.60)'
  return 'rgba(233,69,96,0.75)'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WindArrow({ cx, cy, dirDeg }: { cx: number; cy: number; dirDeg: number }) {
  // Arrow points in the wind's FLOW direction (where the wind goes)
  const flowAngle = (dirDeg + 180) % 360
  return (
    <g transform={`translate(${cx},${cy}) rotate(${flowAngle})`}>
      <line x1={0} y1={7} x2={0} y2={-6} stroke="rgba(255,255,255,0.70)" strokeWidth={1.5} strokeLinecap="round" />
      <polygon points="0,-10 -3.5,-4.5 3.5,-4.5" fill="rgba(255,255,255,0.70)" />
    </g>
  )
}

function GrametChart({ data }: { data: GrametData }) {
  const wps = data.waypoints
  const n   = wps.length

  const svgW = MARGIN.left + n * CELL_W + MARGIN.right
  const svgH = MARGIN.top  + LEVELS.length * CELL_H + MARGIN.bottom

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      style={{ display: 'block', maxHeight: '100%' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* ── Cells ── */}
      {LEVELS.map((lvl, li) => {
        const yCell = MARGIN.top + li * CELL_H
        return wps.map((wp, wi) => {
          const xCell = MARGIN.left + wi * CELL_W
          const ld    = wp.levels.find(l => l.pressureHPa === lvl.pressureHPa)
          const kts   = ld?.windSpeedKt ?? 0
          const dir   = ld?.windDirDeg  ?? 0
          const temp  = ld?.tempC       ?? 0
          const cx    = xCell + CELL_W / 2
          const cy    = yCell + CELL_H / 2

          return (
            <g key={`${li}-${wi}`}>
              <rect
                x={xCell + 1} y={yCell + 1}
                width={CELL_W - 2} height={CELL_H - 2}
                rx={4}
                fill={windColor(kts)}
                stroke="rgba(244,247,255,0.06)"
                strokeWidth={1}
              />
              <WindArrow cx={cx} cy={cy - 6} dirDeg={dir} />
              <text
                x={cx} y={cy + 16}
                textAnchor="middle"
                fill="rgba(244,247,255,0.65)"
                fontSize={9}
                fontFamily="monospace"
              >
                {temp > 0 ? '+' : ''}{temp.toFixed(1)}°
              </text>
            </g>
          )
        })
      })}

      {/* ── Grid lines ── */}
      {[...LEVELS.map((_, li) => MARGIN.top + li * CELL_H),
        MARGIN.top + LEVELS.length * CELL_H].map((y, i) => (
        <line key={`h${i}`}
          x1={MARGIN.left} y1={y}
          x2={MARGIN.left + n * CELL_W} y2={y}
          stroke="rgba(244,247,255,0.09)" strokeWidth={1}
        />
      ))}
      {[...wps.map((_, wi) => MARGIN.left + wi * CELL_W),
        MARGIN.left + n * CELL_W].map((x, i) => (
        <line key={`v${i}`}
          x1={x} y1={MARGIN.top}
          x2={x} y2={MARGIN.top + LEVELS.length * CELL_H}
          stroke="rgba(244,247,255,0.09)" strokeWidth={1}
        />
      ))}

      {/* ── Y-axis: FL labels ── */}
      {LEVELS.map((lvl, li) => (
        <text
          key={lvl.label}
          x={MARGIN.left - 10}
          y={MARGIN.top + li * CELL_H + CELL_H / 2 + 4}
          textAnchor="end"
          fill="rgba(244,247,255,0.50)"
          fontSize={11}
          fontFamily="monospace"
          fontWeight={500}
        >
          {lvl.label}
        </text>
      ))}

      {/* ── X-axis: waypoint IDs + distances ── */}
      {wps.map((wp, wi) => {
        const cx   = MARGIN.left + wi * CELL_W + CELL_W / 2
        const yBot = MARGIN.top + LEVELS.length * CELL_H
        return (
          <g key={`x${wi}`}>
            <text
              x={cx} y={yBot + 18}
              textAnchor="middle"
              fill="rgba(244,247,255,0.80)"
              fontSize={11}
              fontFamily="monospace"
              fontWeight={600}
            >
              {wp.id.length > 6 ? wp.id.slice(0, 5) + '…' : wp.id}
            </text>
            {wp.distanceNm > 0 && (
              <text
                x={cx} y={yBot + 33}
                textAnchor="middle"
                fill="rgba(244,247,255,0.32)"
                fontSize={9}
                fontFamily="monospace"
              >
                {Math.round(wp.distanceNm)}nm
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Left-panel helpers ────────────────────────────────────────────────────────

const S = {
  back: {
    display: 'flex', alignItems: 'center', gap: 8,
    color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
    background: 'transparent', border: 'none', padding: 0, width: 'fit-content',
  } as React.CSSProperties,
  title: {
    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
    letterSpacing: '-0.04em', color: 'var(--text)',
  } as React.CSSProperties,
  subtitle: { fontSize: 13, color: 'var(--muted)', marginTop: 4 } as React.CSSProperties,
  sectionTitle: {
    fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase' as const,
    letterSpacing: '0.07em', marginBottom: 8,
  },
  swatch: (color: string) => ({
    width: 14, height: 14, borderRadius: 3, background: color,
    flexShrink: 0, border: '1px solid rgba(244,247,255,0.12)',
  } as React.CSSProperties),
  refresh: (disabled: boolean) => ({
    padding: '8px 14px', borderRadius: 10,
    fontSize: 13, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
    color: disabled ? 'var(--dim)' : 'var(--text)',
    background: disabled ? 'var(--glass-2)' : 'var(--violet-dim)',
    border: `1px solid ${disabled ? 'var(--line-2)' : 'rgba(139,124,255,.35)'}`,
    transition: 'all .15s',
  } as React.CSSProperties),
  empty: {
    margin: 'auto', textAlign: 'center' as const,
    color: 'var(--dim)', fontSize: 14, lineHeight: 1.6, maxWidth: 280,
  },
  centered: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
  } as React.CSSProperties,
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GRAMETScreen({
  route,
  departure,
  arrival,
  onBack,
}: {
  route:     SelectedRoute | null
  departure: { icao: string; name?: string } | null
  arrival:   { icao: string; name?: string } | null
  onBack:    () => void
}) {
  const [data,        setData]        = useState<GrametData | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  // Sample route waypoints to at most MAX_WPS with valid coordinates
  const sampledWps = useMemo<Array<{ id: string; lat: number; lon: number; distCum: number }>>(() => {
    if (!route?.waypoints) return []
    const valid = route.waypoints.filter(
      (w): w is typeof w & { lat: number; lon: number } =>
        w.lat != null && w.lon != null,
    )
    if (valid.length <= MAX_WPS) return valid.map(w => ({ id: w.id, lat: w.lat, lon: w.lon, distCum: w.distCum ?? 0 }))
    const step = valid.length / MAX_WPS
    return Array.from({ length: MAX_WPS }, (_, i) => {
      const w = valid[Math.round(i * step)]
      return { id: w.id, lat: w.lat, lon: w.lon, distCum: w.distCum ?? 0 }
    })
  }, [route])

  const load = useCallback(async (signal?: AbortSignal) => {
    if (sampledWps.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchGramet(
        sampledWps.map(w => ({ id: w.id, lat: w.lat, lon: w.lon, distanceNm: w.distCum })),
        signal,
      )
      setData(result)
      setLastFetched(new Date())
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Failed to load GRAMET data')
    } finally {
      setLoading(false)
    }
  }, [sampledWps])

  // Auto-fetch when waypoints change
  useEffect(() => {
    const ctrl = new AbortController()
    setData(null)
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  return (
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', overflow: 'hidden' }}>

      {/* ── Left panel ── */}
      <aside style={{
        borderRight: '1px solid var(--line)',
        padding: '24px 20px',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        <button onClick={onBack} style={S.back}>
          <span style={{ fontSize: 16 }}>←</span> Back to Flight Plan
        </button>

        <div>
          <div style={S.title}>GRAMET Chart</div>
          <div style={S.subtitle}>
            {departure?.icao ?? '—'} → {arrival?.icao ?? '—'}
          </div>
        </div>

        {/* Wind speed legend */}
        <div>
          <div style={S.sectionTitle}>Wind Speed</div>
          {WIND_LEGEND.map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
              <div style={S.swatch(color)} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Chart key */}
        <div>
          <div style={S.sectionTitle}>Chart Key</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
            <div>↑ Arrow — wind direction (flow)</div>
            <div>°C — temperature at pressure level</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {error && !loading && (
            <div style={{
              padding: '10px 12px', borderRadius: 'var(--r)',
              background: 'var(--red-soft)', border: '1px solid rgba(233,69,96,.3)',
              fontSize: 12, color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={() => load()}
            disabled={loading || sampledWps.length === 0}
            style={S.refresh(loading || sampledWps.length === 0)}
          >
            {loading ? 'Loading…' : '↺ Refresh'}
          </button>

          {lastFetched && (
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>
              Updated {lastFetched.toLocaleTimeString()}
            </div>
          )}

          <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.5, marginTop: 4 }}>
            Source: Open Meteo (GFS / ICON)<br />
            For flight simulation only.
          </div>
        </div>
      </aside>

      {/* ── Right panel: chart ── */}
      <main style={{
        overflow: 'auto', padding: '28px 24px',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* No route loaded */}
        {!route && (
          <div style={S.centered}>
            <div style={S.empty}>
              Calculate a route first to view the GRAMET chart.
            </div>
          </div>
        )}

        {/* Loading (first load, no data yet) */}
        {route && loading && !data && (
          <div style={S.centered}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: 'var(--muted)', fontSize: 13 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid var(--line)',
                borderTopColor: 'var(--violet)',
                animation: 'spin 0.8s linear infinite',
              }} />
              Fetching weather data from Open Meteo…
            </div>
          </div>
        )}

        {/* Error (no data at all) */}
        {route && error && !data && !loading && (
          <div style={S.centered}>
            <div style={S.empty}>
              <div style={{ color: 'var(--red)', marginBottom: 12 }}>Failed to load GRAMET data.</div>
              <button
                onClick={() => load()}
                style={{ ...S.refresh(false), margin: '0 auto' }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Chart */}
        {data && (
          <div style={{ position: 'relative', width: '100%' }}>
            {loading && (
              <div style={{
                position: 'absolute', top: 0, right: 0, zIndex: 1,
                fontSize: 11, color: 'var(--muted)',
                animation: 'pulse 1s ease-in-out infinite',
              }}>
                Refreshing…
              </div>
            )}
            <GrametChart data={data} />
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

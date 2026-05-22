import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchGramet } from '../services/grametService.ts'
import type { GrametData, GrametWaypointData } from '../services/grametService.ts'
import type { SelectedRoute } from '../services/routeService.ts'

// ── Chart geometry ────────────────────────────────────────────────────────────

const MARGIN    = { top: 44, right: 24, bottom: 90, left: 76 }
const CELL_H    = 68
const CELL_W    = 110
const MAX_WPS   = 12
const CLOUD_H   = 11
const CLOUD_GAP = 2

// ── Altitude levels ───────────────────────────────────────────────────────────

const LEVELS = [
  { pressureHPa: 200, label: 'FL390' },
  { pressureHPa: 250, label: 'FL340' },
  { pressureHPa: 300, label: 'FL300' },
  { pressureHPa: 500, label: 'FL180' },
  { pressureHPa: 700, label: 'FL100' },
  { pressureHPa: 850, label: 'FL050' },
]

const CLOUD_LAYERS = [
  { label: 'HI',  pressureHPa: 300 },
  { label: 'MED', pressureHPa: 700 },
  { label: 'LOW', pressureHPa: 850 },
]

// ── Wind speed → cell background color ───────────────────────────────────────

const WIND_CATS = [
  { max:  5, color: '#0d1225' },
  { max: 15, color: '#0b2140' },
  { max: 30, color: '#0e3a6e' },
  { max: 50, color: '#1b5496' },
  { max: 70, color: '#4a3298' },
  { max: 90, color: '#7c3c12' },
  { max: Infinity, color: '#7c1a1a' },
]

function windColor(kts: number): string {
  return (WIND_CATS.find(c => kts < c.max) ?? WIND_CATS[WIND_CATS.length - 1]).color
}

// ── Temperature → text color ──────────────────────────────────────────────────

function tempColor(c: number): string {
  if (c > 5)   return '#f0a05e'
  if (c > 0)   return '#d2ccbe'
  if (c > -20) return '#9ac8ea'
  if (c > -40) return '#58abe2'
  return '#1a96e0'
}

// ── Wind direction arrow ──────────────────────────────────────────────────────

function WindArrow({ cx, cy, dirDeg, kts }: {
  cx: number; cy: number; dirDeg: number; kts: number
}) {
  const flowAngle = (dirDeg + 180) % 360
  const op = kts < 3 ? 0.18 : 0.92
  return (
    <g transform={`translate(${cx},${cy}) rotate(${flowAngle})`} opacity={op}>
      <line x1={0} y1={12} x2={0} y2={-9}
        stroke="rgba(255,255,255,0.95)" strokeWidth={2.5} strokeLinecap="round" />
      <polygon points="0,-15 -5.5,-6 5.5,-6" fill="rgba(255,255,255,0.95)" />
    </g>
  )
}

// ── 0°C isotherm ──────────────────────────────────────────────────────────────

function IsoTherm({ wps, ml, mt }: {
  wps: GrametWaypointData[]; ml: number; mt: number
}) {
  const pts: Array<{ x: number; y: number }> = []

  wps.forEach((wp, wi) => {
    const cx = ml + wi * CELL_W + CELL_W / 2
    for (let li = 0; li < LEVELS.length - 1; li++) {
      const t0 = wp.levels.find(l => l.pressureHPa === LEVELS[li].pressureHPa)?.tempC ?? 0
      const t1 = wp.levels.find(l => l.pressureHPa === LEVELS[li + 1].pressureHPa)?.tempC ?? 0
      if ((t0 >= 0) !== (t1 >= 0)) {
        const frac = (0 - t0) / (t1 - t0)
        const y0   = mt + li * CELL_H + CELL_H / 2
        const y1   = mt + (li + 1) * CELL_H + CELL_H / 2
        pts.push({ x: cx, y: y0 + frac * (y1 - y0) })
        break
      }
    }
  })

  if (pts.length < 2) return null
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <g>
      <path d={d} fill="none" stroke="rgba(0,240,200,0.16)" strokeWidth={8}
        strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="rgba(0,240,200,0.90)" strokeWidth={1.8}
        strokeDasharray="6,4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

// ── Cloud cover strips ────────────────────────────────────────────────────────

function CloudStrips({ wps, ml, yStart }: {
  wps: GrametWaypointData[]; ml: number; yStart: number
}) {
  return (
    <>
      <line x1={ml} y1={yStart - 6} x2={ml + wps.length * CELL_W} y2={yStart - 6}
        stroke="rgba(244,247,255,0.07)" strokeWidth={1} />
      {CLOUD_LAYERS.map((layer, li) => {
        const y = yStart + li * (CLOUD_H + CLOUD_GAP)
        return (
          <g key={layer.label}>
            <text x={ml - 8} y={y + CLOUD_H / 2 + 3.5} textAnchor="end"
              fill="rgba(244,247,255,0.28)" fontSize={8} fontFamily="monospace">
              {layer.label}
            </text>
            {wps.map((wp, wi) => {
              const pct   = wp.levels.find(l => l.pressureHPa === layer.pressureHPa)?.cloudCoverPct ?? 0
              const alpha = (pct / 100) * 0.80
              return (
                <rect key={wi}
                  x={ml + wi * CELL_W + 1} y={y}
                  width={CELL_W - 2} height={CLOUD_H} rx={2}
                  fill={`rgba(160,195,230,${alpha.toFixed(2)})`}
                  stroke="rgba(244,247,255,0.04)" strokeWidth={1}
                />
              )
            })}
          </g>
        )
      })}
    </>
  )
}

// ── Main chart SVG ────────────────────────────────────────────────────────────

function GrametChart({ data, dep, arr }: {
  data: GrametData
  dep: { icao: string } | null
  arr: { icao: string } | null
}) {
  const wps   = data.waypoints
  const n     = wps.length
  const t     = new Date(data.generatedAt)
  const hhmm  = `${t.getUTCHours().toString().padStart(2, '0')}:${t.getUTCMinutes().toString().padStart(2, '0')} UTC`
  const title = `GRAMET  ·  ${dep?.icao ?? '—'} → ${arr?.icao ?? '—'}  ·  ${hhmm}`

  const mainH  = LEVELS.length * CELL_H
  const svgW   = MARGIN.left + n * CELL_W + MARGIN.right
  const svgH   = MARGIN.top + mainH + MARGIN.bottom
  const yCloud = MARGIN.top + mainH + 42

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <svg width={svgW} height={svgH} style={{ display: 'block' }}>

        {/* Title */}
        <text
          x={MARGIN.left + (n * CELL_W) / 2} y={24}
          textAnchor="middle"
          fill="rgba(244,247,255,0.60)" fontSize={12}
          fontFamily="monospace" fontWeight={600}
        >
          {title}
        </text>

        {/* Cells */}
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
                  rx={3} fill={windColor(kts)}
                  stroke="rgba(244,247,255,0.07)" strokeWidth={1}
                />
                <text x={xCell + CELL_W - 6} y={yCell + 13} textAnchor="end"
                  fill="rgba(255,255,255,0.48)" fontSize={9} fontFamily="monospace">
                  {Math.round(kts)}kt
                </text>
                <WindArrow cx={cx} cy={cy - 7} dirDeg={dir} kts={kts} />
                <text x={cx} y={yCell + CELL_H - 9} textAnchor="middle"
                  fill={tempColor(temp)}
                  fontSize={11} fontFamily="monospace" fontWeight={600}>
                  {temp > 0 ? '+' : ''}{temp.toFixed(1)}°
                </text>
              </g>
            )
          })
        })}

        {/* Horizontal grid lines */}
        {Array.from({ length: LEVELS.length + 1 }, (_, i) => MARGIN.top + i * CELL_H).map((y, i) => (
          <line key={`h${i}`}
            x1={MARGIN.left} y1={y} x2={MARGIN.left + n * CELL_W} y2={y}
            stroke="rgba(244,247,255,0.09)" strokeWidth={1} />
        ))}

        {/* Vertical grid lines */}
        {Array.from({ length: n + 1 }, (_, i) => MARGIN.left + i * CELL_W).map((x, i) => (
          <line key={`v${i}`}
            x1={x} y1={MARGIN.top} x2={x} y2={MARGIN.top + mainH}
            stroke="rgba(244,247,255,0.09)" strokeWidth={1} />
        ))}

        {/* 0°C isotherm */}
        <IsoTherm wps={wps} ml={MARGIN.left} mt={MARGIN.top} />

        {/* Y-axis labels */}
        {LEVELS.map((lvl, li) => (
          <text key={lvl.label}
            x={MARGIN.left - 10}
            y={MARGIN.top + li * CELL_H + CELL_H / 2 + 4}
            textAnchor="end"
            fill="rgba(244,247,255,0.55)"
            fontSize={11} fontFamily="monospace" fontWeight={500}>
            {lvl.label}
          </text>
        ))}

        {/* X-axis labels */}
        {wps.map((wp, wi) => {
          const cx   = MARGIN.left + wi * CELL_W + CELL_W / 2
          const yBot = MARGIN.top + mainH
          return (
            <g key={`x${wi}`}>
              <text x={cx} y={yBot + 16} textAnchor="middle"
                fill="rgba(244,247,255,0.85)"
                fontSize={11} fontFamily="monospace" fontWeight={600}>
                {wp.id.length > 6 ? wp.id.slice(0, 5) + '…' : wp.id}
              </text>
              {wp.distanceNm > 0 && (
                <text x={cx} y={yBot + 30} textAnchor="middle"
                  fill="rgba(244,247,255,0.30)"
                  fontSize={9} fontFamily="monospace">
                  {Math.round(wp.distanceNm)}nm
                </text>
              )}
            </g>
          )
        })}

        {/* Cloud cover strips */}
        <CloudStrips wps={wps} ml={MARGIN.left} yStart={yCloud} />

      </svg>
    </div>
  )
}

// ── Wind speed gradient legend ────────────────────────────────────────────────

const GRAD_ID = 'wg-grad'

function WindLegendBar() {
  const w = 220
  const h = 12
  return (
    <div>
      <div style={{
        fontSize: 10, color: 'var(--dim)',
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8,
      }}>
        Wind Speed (kt)
      </div>
      <svg width={w} height={36} style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id={GRAD_ID} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0d1225" />
            <stop offset="18%"  stopColor="#0b2140" />
            <stop offset="36%"  stopColor="#0e3a6e" />
            <stop offset="54%"  stopColor="#1b5496" />
            <stop offset="67%"  stopColor="#4a3298" />
            <stop offset="81%"  stopColor="#7c3c12" />
            <stop offset="100%" stopColor="#7c1a1a" />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={w} height={h} rx={3}
          fill={`url(#${GRAD_ID})`}
          stroke="rgba(244,247,255,0.15)" strokeWidth={1}
        />
        {([
          { label: '0',   pct: 0   },
          { label: '15',  pct: 18  },
          { label: '30',  pct: 36  },
          { label: '50',  pct: 54  },
          { label: '70',  pct: 67  },
          { label: '90',  pct: 81  },
          { label: '90+', pct: 100 },
        ]).map(tick => {
          const x = (tick.pct / 100) * w
          return (
            <g key={tick.label}>
              <line x1={x} y1={h} x2={x} y2={h + 4}
                stroke="rgba(244,247,255,0.25)" strokeWidth={1} />
              <text x={x} y={h + 14} textAnchor="middle"
                fill="rgba(244,247,255,0.38)" fontSize={8.5} fontFamily="monospace">
                {tick.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  secLabel: {
    fontSize: 10, color: 'var(--dim)',
    textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 8,
  },
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

const TEMP_LEGEND = [
  { color: '#f0a05e', label: '> +5°C    warm'      },
  { color: '#d2ccbe', label: '0–5°C     near zero'  },
  { color: '#9ac8ea', label: '−20–0°C   cold'       },
  { color: '#58abe2', label: '−40–−20°C very cold'  },
  { color: '#1a96e0', label: '< −40°C   extreme'    },
]

// ── Screen component ──────────────────────────────────────────────────────────

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

  const sampledWps = useMemo<Array<{ id: string; lat: number; lon: number; distCum: number }>>(() => {
    if (!route?.waypoints) return []
    const valid = route.waypoints.filter(
      (w): w is typeof w & { lat: number; lon: number } => w.lat != null && w.lon != null,
    )
    if (valid.length <= MAX_WPS)
      return valid.map(w => ({ id: w.id, lat: w.lat, lon: w.lon, distCum: w.distCum ?? 0 }))
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

  useEffect(() => {
    const ctrl = new AbortController()
    setData(null)
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  return (
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', overflow: 'hidden' }}>

      {/* Left panel */}
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
        <WindLegendBar />

        {/* Temperature legend */}
        <div>
          <div style={S.secLabel}>Temperature</div>
          {TEMP_LEGEND.map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
              <div style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                background: color, border: '1px solid rgba(244,247,255,0.12)',
              }} />
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Chart key */}
        <div>
          <div style={S.secLabel}>Chart Key</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 2.0 }}>
            <div>↑ Arrow — wind direction (flow)</div>
            <div>
              <span style={{ color: 'rgba(0,240,200,0.85)', letterSpacing: 2 }}>– –</span>
              {' '}0°C isotherm
            </div>
            <div style={{ color: 'rgba(160,195,230,0.70)' }}>
              HI / MED / LOW cloud cover
            </div>
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

      {/* Right panel: chart */}
      <main style={{
        overflow: 'auto', padding: '28px 24px',
        display: 'flex', flexDirection: 'column',
      }}>

        {!route && (
          <div style={S.centered}>
            <div style={S.empty}>
              Calculate a route first to view the GRAMET chart.
            </div>
          </div>
        )}

        {route && loading && !data && (
          <div style={S.centered}>
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 16, color: 'var(--muted)', fontSize: 13,
            }}>
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

        {route && error && !data && !loading && (
          <div style={S.centered}>
            <div style={S.empty}>
              <div style={{ color: 'var(--red)', marginBottom: 12 }}>Failed to load GRAMET data.</div>
              <button onClick={() => load()} style={{ ...S.refresh(false), margin: '0 auto' }}>
                Retry
              </button>
            </div>
          </div>
        )}

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
            <GrametChart data={data} dep={departure} arr={arrival} />
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

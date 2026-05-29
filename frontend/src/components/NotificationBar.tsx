import { useState, useEffect, useMemo } from 'react'
import { checkRouteConflicts, CONFLICT_ZONES } from '../data/conflictZones'

export default function NotificationBar({ routeWarning, routeConfigError, onRetry, route, alternate, selectedAircraftProfile }) {
  const [expanded, setExpanded] = useState(false)

  // Auto-expand when a route warning appears so Retry is immediately visible
  useEffect(() => {
    if (routeWarning) setExpanded(true)
  }, [routeWarning])

  const routeNm = route?.routeDistanceNm ?? route?.waypoints?.[route.waypoints.length - 1]?.distCum
  const rangeExceeded = route && selectedAircraftProfile && routeNm && routeNm > selectedAircraftProfile.maxRangeNm

  const hitZones = useMemo(
    () => route?.waypoints ? checkRouteConflicts(route.waypoints, CONFLICT_ZONES) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route?.waypoints],
  )

  type Msg = { kind: 'error' | 'warn'; text: string; retryable?: boolean }
  const msgs: Msg[] = [
    { kind: 'error', text: 'Flight simulation only — routes must not be used for real-world navigation.' },
    { kind: 'warn',  text: 'METAR/TAF data is for flight simulation only and must not be used for real-world aviation decisions.' },
  ]
  if (routeConfigError)
    msgs.push({ kind: 'error', text: `Server configuration error — ${routeConfigError}` })
  if (routeWarning && !routeConfigError)
    msgs.push({ kind: 'warn', text: routeWarning, retryable: true })
  if (rangeExceeded)
    msgs.push({ kind: 'warn', text: `Route distance (${routeNm.toLocaleString()} NM) exceeds the approximate range of ${selectedAircraftProfile.icaoCode} (${selectedAircraftProfile.maxRangeNm.toLocaleString()} NM).` })
  if (route && !alternate)
    msgs.push({ kind: 'warn', text: 'No alternate airport set — required by ICAO regulations for IFR flights.' })
  hitZones.forEach(zone =>
    msgs.push({
      kind: zone.level === 'avoid' ? 'error' : 'warn',
      text: `Restricted airspace — ${zone.name}: ${zone.reason}`,
    })
  )

  const hasError  = msgs.some(m => m.kind === 'error')
  const accentClr = hasError ? 'var(--red)' : 'var(--amber)'
  const borderClr = hasError ? 'rgba(233,69,96,.3)' : 'rgba(255,180,80,.35)'
  const bgClr     = hasError ? 'rgba(233,69,96,.08)' : 'rgba(255,180,80,.07)'
  const n         = msgs.length

  return (
    <div style={{ flexShrink: 0 }}>
      {/* ── Collapsed summary ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', padding: '5px 11px',
          borderRadius: expanded ? 'var(--r-sm) var(--r-sm) 0 0' : 'var(--r-sm)',
          background: bgClr,
          border: `1px solid ${borderClr}`,
          borderBottom: expanded ? 'none' : `1px solid ${borderClr}`,
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', textAlign: 'left' as const,
        }}
      >
        <span style={{ color: accentClr, fontSize: 13, flexShrink: 0 }}>
          {hasError ? '⊗' : '⚠'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1 }}>
          {n} {n === 1 ? 'notice' : 'notices'}
          {hasError && <span style={{ color: 'var(--red)', marginLeft: 6 }}>· configuration error</span>}
          {routeWarning && !hasError && <span style={{ color: 'var(--amber)', marginLeft: 6 }}>· route fallback active</span>}
        </span>
        <span style={{
          color: 'var(--dim)', fontSize: 10,
          display: 'inline-block',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform .15s',
        }}>▾</span>
      </button>

      {/* ── Expanded list ── */}
      {expanded && (
        <div style={{
          border: `1px solid ${borderClr}`,
          borderRadius: '0 0 var(--r-sm) var(--r-sm)',
          overflow: 'hidden',
        }}>
          {msgs.map((msg, i) => (
            <div key={i} style={{
              padding: '6px 11px',
              background: msg.kind === 'error' ? 'rgba(233,69,96,.10)' : 'rgba(255,180,80,.08)',
              borderTop: i > 0 ? `1px solid ${borderClr}` : 'none',
              fontSize: 11, color: 'var(--text)', lineHeight: 1.45,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ color: msg.kind === 'error' ? 'var(--red)' : 'var(--amber)', flexShrink: 0, fontSize: 12, marginTop: 1 }}>
                {msg.kind === 'error' ? '⊗' : '⚡'}
              </span>
              <span style={{ flex: 1 }}>{msg.text}</span>
              {msg.retryable && onRetry && (
                <button
                  onClick={onRetry}
                  style={{
                    flexShrink: 0, alignSelf: 'center',
                    padding: '2px 9px', borderRadius: 5,
                    background: 'rgba(255,180,80,.15)',
                    border: '1px solid rgba(255,180,80,.4)',
                    color: 'var(--amber)', fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', letterSpacing: '0.04em',
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

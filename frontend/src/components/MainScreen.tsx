import { useState } from 'react'
import FlightInput    from './FlightInput.tsx'
import WeatherPanel   from './WeatherPanel.tsx'
import AIPanel        from './AIPanel.tsx'
import FuelPanel      from './FuelPanel.tsx'
import ExportPanel    from './ExportPanel.tsx'
import WaypointTable  from './WaypointTable.tsx'
import RouteMap       from './RouteMap.tsx'
import AlternativesPanel from './AlternativesPanel.tsx'
import { useWindowWidth } from '../hooks/useWindowWidth.ts'

export default function MainScreen({
  departure, arrival, alternate, route, selectedSID, selectedSTAR, routeState, selectedAircraftProfile,
  cruisingAltitude, onAircraftChange, onAltitudeChange, onDepartureChange, onArrivalChange,
  onAlternateChange, onCalculate, onNavigate, onSIDChange, onSTARChange, routeWarning, routeConfigError, alternatives,
}) {
  const width    = useWindowWidth()
  const isNarrow = width < 1024

  if (isNarrow) return <NarrowLayout {...{
    departure, arrival, alternate, route, selectedSID, selectedSTAR, routeState, selectedAircraftProfile,
    cruisingAltitude, onAircraftChange, onAltitudeChange, onDepartureChange, onArrivalChange,
    onAlternateChange, onCalculate, onNavigate, onSIDChange, onSTARChange, routeWarning, routeConfigError, alternatives,
  }} />

  return (
    <div style={{
      flex: 1, display: 'grid', overflow: 'hidden',
      gridTemplateColumns: '300px 1fr 300px',
      gridTemplateRows: '1fr auto',
      gap: 0,
    }}>
      {/* ── Left panel ── */}
      <aside style={{
        gridRow: '1 / 3',
        padding: '20px 16px 20px 20px',
        overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
        borderRight: '1px solid var(--line)',
      }}>
        <FlightInput
          departure={departure}
          arrival={arrival}
          alternate={alternate}
          routeState={routeState}
          selectedSID={selectedSID}
          selectedSTAR={selectedSTAR}
          selectedAircraftProfile={selectedAircraftProfile}
          cruisingAltitude={cruisingAltitude}
          onAircraftChange={onAircraftChange}
          onAltitudeChange={onAltitudeChange}
          onDepartureChange={onDepartureChange}
          onArrivalChange={onArrivalChange}
          onAlternateChange={onAlternateChange}
          onCalculate={onCalculate}
          onNavigate={onNavigate}
          onSIDChange={onSIDChange}
          onSTARChange={onSTARChange}
        />

        {alternatives && alternatives.length > 0 && (
          <AlternativesPanel alternatives={alternatives} />
        )}
      </aside>

      {/* ── Map center ── */}
      <main style={{
        gridRow: '1 / 2',
        padding: '12px 12px 8px',
        display: 'flex', flexDirection: 'column', gap: 8,
        overflow: 'hidden',
      }}>
        <NotificationBar
          routeWarning={routeWarning}
          routeConfigError={routeConfigError}
          route={route}
          alternate={alternate}
          selectedAircraftProfile={selectedAircraftProfile}
        />
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <RouteMap
            departure={departure}
            arrival={arrival}
            alternate={alternate}
            route={route}
            selectedSID={selectedSID}
            selectedSTAR={selectedSTAR}
            routeState={routeState}
            selectedAircraftProfile={selectedAircraftProfile}
          />
        </div>
      </main>

      {/* ── Route string + waypoint table (below map) ── */}
      <section style={{
        gridColumn: '2 / 3',
        padding: '0 12px 16px',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {route && <RouteTextBox route={route} selectedSID={selectedSID} selectedSTAR={selectedSTAR} />}
        {route
          ? <WaypointTable route={route} selectedSID={selectedSID} selectedSTAR={selectedSTAR} />
          : <EmptyTable />
        }
      </section>

      {/* ── Right panel ── */}
      <aside style={{
        gridRow: '1 / 3',
        padding: '20px 20px 20px 16px',
        overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
        borderLeft: '1px solid var(--line)',
      }}>
        {route ? (
          <AIPanel
            departure={departure}
            arrival={arrival}
            alternate={alternate}
            route={route}
            selectedSID={selectedSID}
            selectedSTAR={selectedSTAR}
            selectedAircraftProfile={selectedAircraftProfile}
          />
        ) : (
          <AIEmpty />
        )}

        <ExportPanel
          route={route}
          departure={departure}
          arrival={arrival}
          alternate={alternate}
          selectedAircraftProfile={selectedAircraftProfile}
          selectedSID={selectedSID}
          selectedSTAR={selectedSTAR}
        />

        <FuelPanel
          route={route}
          arrival={arrival}
          alternate={alternate}
          selectedAircraftProfile={selectedAircraftProfile}
        />

        <WeatherPanel departure={departure} arrival={arrival} />
      </aside>
    </div>
  )
}

// ── Narrow (tablet / mobile) layout ────────────────────────────────────────────

function NarrowLayout({
  departure, arrival, alternate, route, selectedSID, selectedSTAR, routeState, selectedAircraftProfile,
  cruisingAltitude, onAircraftChange, onAltitudeChange, onDepartureChange, onArrivalChange,
  onAlternateChange, onCalculate, onNavigate, onSIDChange, onSTARChange, routeWarning, routeConfigError, alternatives,
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Flight input section */}
      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FlightInput
          departure={departure}
          arrival={arrival}
          alternate={alternate}
          routeState={routeState}
          selectedSID={selectedSID}
          selectedSTAR={selectedSTAR}
          selectedAircraftProfile={selectedAircraftProfile}
          cruisingAltitude={cruisingAltitude}
          onAircraftChange={onAircraftChange}
          onAltitudeChange={onAltitudeChange}
          onDepartureChange={onDepartureChange}
          onArrivalChange={onArrivalChange}
          onAlternateChange={onAlternateChange}
          onCalculate={onCalculate}
          onNavigate={onNavigate}
          onSIDChange={onSIDChange}
          onSTARChange={onSTARChange}
        />

        {alternatives && alternatives.length > 0 && (
          <AlternativesPanel alternatives={alternatives} />
        )}
      </div>

      {/* Notifications above map */}
      <div style={{ padding: '8px 16px 0' }}>
        <NotificationBar
          routeWarning={routeWarning}
          routeConfigError={routeConfigError}
          route={route}
          alternate={alternate}
          selectedAircraftProfile={selectedAircraftProfile}
        />
      </div>

      {/* Map */}
      <div style={{ padding: '8px 16px', height: 340, flexShrink: 0, position: 'relative' }}>
        <RouteMap
          departure={departure}
          arrival={arrival}
          alternate={alternate}
          route={route}
          selectedSID={selectedSID}
          selectedSTAR={selectedSTAR}
          routeState={routeState}
          selectedAircraftProfile={selectedAircraftProfile}
        />
      </div>

      {/* Route string + waypoint table */}
      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {route && <RouteTextBox route={route} selectedSID={selectedSID} selectedSTAR={selectedSTAR} />}
        {route
          ? <WaypointTable route={route} selectedSID={selectedSID} selectedSTAR={selectedSTAR} />
          : <EmptyTable />
        }
      </div>

      {/* Right panel content — stacked */}
      <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {route ? (
          <AIPanel
            departure={departure}
            arrival={arrival}
            alternate={alternate}
            route={route}
            selectedSID={selectedSID}
            selectedSTAR={selectedSTAR}
            selectedAircraftProfile={selectedAircraftProfile}
          />
        ) : (
          <AIEmpty />
        )}

        <ExportPanel
          route={route}
          departure={departure}
          arrival={arrival}
          alternate={alternate}
          selectedAircraftProfile={selectedAircraftProfile}
          selectedSID={selectedSID}
          selectedSTAR={selectedSTAR}
        />

        <FuelPanel
          route={route}
          arrival={arrival}
          alternate={alternate}
          selectedAircraftProfile={selectedAircraftProfile}
        />

        <WeatherPanel departure={departure} arrival={arrival} />
      </div>
    </div>
  )
}

// ── Notification bar (above map) ───────────────────────────────────────────────

function NotificationBar({ routeWarning, routeConfigError, route, alternate, selectedAircraftProfile }) {
  const [expanded, setExpanded] = useState(false)

  const routeNm = route?.routeDistanceNm ?? route?.waypoints?.[route.waypoints.length - 1]?.distCum
  const rangeExceeded = route && selectedAircraftProfile && routeNm && routeNm > selectedAircraftProfile.maxRangeNm

  type Msg = { kind: 'error' | 'warn'; text: string }
  const msgs: Msg[] = [
    { kind: 'error', text: 'Flight simulation only — routes must not be used for real-world navigation.' },
    { kind: 'warn',  text: 'METAR/TAF data is for flight simulation only and must not be used for real-world aviation decisions.' },
  ]
  if (routeConfigError)
    msgs.push({ kind: 'error', text: `Server configuration error — ${routeConfigError}` })
  if (routeWarning && !routeConfigError)
    msgs.push({ kind: 'warn', text: routeWarning })
  if (rangeExceeded)
    msgs.push({ kind: 'warn', text: `Route distance (${routeNm.toLocaleString()} NM) exceeds the approximate range of ${selectedAircraftProfile.icaoCode} (${selectedAircraftProfile.maxRangeNm.toLocaleString()} NM).` })
  if (route && !alternate)
    msgs.push({ kind: 'warn', text: 'No alternate airport set — required by ICAO regulations for IFR flights.' })

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
              <span>{msg.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared sub-components ───────────────────────────────────────────────────────

function RouteTextBox({ route, selectedSID, selectedSTAR }) {
  const [copied, setCopied] = useState(false)

  const wps = route.waypoints
  const depIsAirport = wps[0]?.type === 'airport'
  const arrIsAirport = wps[wps.length - 1]?.type === 'airport'
  const parts: string[] = []
  wps.forEach((wp, i) => {
    parts.push(wp.id.toUpperCase())
    if (depIsAirport && i === 0 && selectedSID)
      parts.push(selectedSID.name.toUpperCase())
    if (arrIsAirport && i === wps.length - 2 && selectedSTAR)
      parts.push(selectedSTAR.name.toUpperCase())
  })
  if (!depIsAirport && selectedSID)  parts.unshift(selectedSID.name.toUpperCase())
  if (!arrIsAirport && selectedSTAR) parts.push(selectedSTAR.name.toUpperCase())
  const text = parts.join(' ')

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      background: 'var(--glass-2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: '12px 16px',
      display: 'flex', alignItems: 'flex-end', gap: 10,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, color: 'var(--dim)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>
          Route String
        </div>
        <input
          readOnly
          value={text}
          onFocus={e => e.currentTarget.select()}
          style={{
            width: '100%', padding: '8px 10px',
            background: 'var(--glass)', border: '1px solid var(--line)',
            borderRadius: 'var(--r-sm)',
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: 'var(--text)', letterSpacing: '0.03em',
          }}
        />
      </div>
      <button
        onClick={handleCopy}
        style={{
          flexShrink: 0, padding: '8px 14px', borderRadius: 'var(--r-sm)',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          color: copied ? 'var(--mint)' : 'var(--text)',
          background: copied ? 'var(--mint-soft)' : 'var(--glass)',
          border: `1px solid ${copied ? 'rgba(0,229,168,.3)' : 'var(--line)'}`,
          transition: 'all .15s',
        }}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  )
}

function EmptyTable() {
  return (
    <div style={{
      border: '1px dashed var(--line)', borderRadius: 'var(--r-lg)',
      padding: '24px', textAlign: 'center',
      color: 'var(--dim)', fontSize: 13,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 18, opacity: .4 }}>◆</span>
      Enter departure and arrival airports, then calculate a route.
    </div>
  )
}

function AIEmpty() {
  return (
    <div style={{
      background: 'var(--glass-2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, margin: '0 auto 14px',
        background: 'linear-gradient(135deg, var(--violet-soft), var(--mint-soft))',
        border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>✦</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
        AI Dispatcher
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
        Calculate a route to receive AI-powered analysis, confidence scores, and dispatcher notes.
      </div>
    </div>
  )
}

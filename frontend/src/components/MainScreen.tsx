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
  onAlternateChange, onCalculate, onNavigate, routeWarning, routeConfigError, alternatives,
}) {
  const width    = useWindowWidth()
  const isNarrow = width < 1024

  if (isNarrow) return <NarrowLayout {...{
    departure, arrival, alternate, route, selectedSID, selectedSTAR, routeState, selectedAircraftProfile,
    cruisingAltitude, onAircraftChange, onAltitudeChange, onDepartureChange, onArrivalChange,
    onAlternateChange, onCalculate, onNavigate, routeWarning, routeConfigError, alternatives,
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
        {route && <RouteTextBox route={route} />}
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
  onAlternateChange, onCalculate, onNavigate, routeWarning, routeConfigError, alternatives,
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
        {route && <RouteTextBox route={route} />}
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
  const routeNm = route?.routeDistanceNm ?? route?.waypoints?.[route.waypoints.length - 1]?.distCum
  const rangeExceeded = route && selectedAircraftProfile && routeNm && routeNm > selectedAircraftProfile.maxRangeNm

  const amber = {
    padding: '6px 11px', borderRadius: 'var(--r-sm)',
    background: 'var(--amber-soft)', border: '1px solid rgba(255,180,80,.4)',
    fontSize: 11, color: 'var(--text)', lineHeight: 1.4,
    display: 'flex', alignItems: 'center', gap: 8,
  } as React.CSSProperties

  const amberIcon = <span style={{ color: 'var(--amber)', flexShrink: 0, fontSize: 13 }}>⚡</span>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>

      {/* Simulation disclaimer — always shown */}
      <div style={{
        padding: '6px 11px', borderRadius: 'var(--r-sm)',
        background: 'rgba(233,69,96,.08)', border: '1px solid rgba(233,69,96,.25)',
        fontSize: 11, color: 'var(--text)', lineHeight: 1.4,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: 'var(--red)', flexShrink: 0, fontSize: 13 }}>⚠</span>
        <span><strong>Flight simulation only</strong> — Routes must not be used for real-world navigation.</span>
      </div>

      {/* METAR/TAF disclaimer — always shown */}
      <div style={amber}>
        {amberIcon}
        <span>METAR/TAF data is shown for flight simulation only and must not be used for real-world aviation decisions.</span>
      </div>

      {/* Server config error */}
      {routeConfigError && (
        <div style={{
          padding: '6px 11px', borderRadius: 'var(--r-sm)',
          background: 'rgba(233,69,96,.12)', border: '1px solid rgba(233,69,96,.45)',
          fontSize: 11, color: 'var(--text)', lineHeight: 1.4,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ color: 'var(--red)', flexShrink: 0, fontSize: 13 }}>⊗</span>
          <span><strong>Server configuration error</strong> — {routeConfigError}</span>
        </div>
      )}

      {/* Route warning */}
      {routeWarning && !routeConfigError && (
        <div style={amber}>{amberIcon}<span>{routeWarning}</span></div>
      )}

      {/* Range warning */}
      {rangeExceeded && (
        <div style={amber}>
          {amberIcon}
          <span>
            Route distance ({routeNm.toLocaleString()} NM) exceeds the approximate range of{' '}
            {selectedAircraftProfile.icaoCode} ({selectedAircraftProfile.maxRangeNm.toLocaleString()} NM).
          </span>
        </div>
      )}

      {/* No alternate warning */}
      {route && !alternate && (
        <div style={amber}>
          {amberIcon}
          <span>No alternate airport set — required by ICAO regulations for IFR flights.</span>
        </div>
      )}

    </div>
  )
}

// ── Shared sub-components ───────────────────────────────────────────────────────

function RouteTextBox({ route }) {
  const [copied, setCopied] = useState(false)

  const text = route.waypoints
    .map(wp => wp.id.toUpperCase())
    .join(' ')

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

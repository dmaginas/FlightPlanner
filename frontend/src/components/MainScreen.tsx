import { useState } from 'react'
import FlightInput    from './FlightInput.tsx'
import NotificationBar from './NotificationBar'
import WeatherPanel   from './WeatherPanel.tsx'
import AIPanel        from './AIPanel.tsx'
import FuelPanel      from './FuelPanel.tsx'
import ExportPanel    from './ExportPanel.tsx'
import WaypointTable  from './WaypointTable.tsx'
import RouteMap       from './RouteMap.tsx'
import AlternativesPanel from './AlternativesPanel.tsx'
import EtopsPanel from './EtopsPanel.tsx'
import { useWindowWidth } from '../hooks/useWindowWidth.ts'

export default function MainScreen({
  departure, arrival, alternate, route, selectedSID, selectedSTAR, routeState, selectedAircraftProfile,
  cruisingAltitude, callsign, onAircraftChange, onAltitudeChange, onCallsignChange, onDepartureChange, onArrivalChange,
  onAlternateChange, onCalculate, onRetry, onNavigate, onSIDChange, onSTARChange, routeWarning, routeConfigError, alternatives,
  onSelectAlternative, enabledLayers, onToggleLayer,
}) {
  const width    = useWindowWidth()
  const isNarrow = width < 1024
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (isNarrow) return <NarrowLayout {...{
    departure, arrival, alternate, route, selectedSID, selectedSTAR, routeState, selectedAircraftProfile,
    cruisingAltitude, callsign, onAircraftChange, onAltitudeChange, onCallsignChange, onDepartureChange, onArrivalChange,
    onAlternateChange, onCalculate, onRetry, onNavigate, onSIDChange, onSTARChange, routeWarning, routeConfigError, alternatives,
    onSelectAlternative, enabledLayers, onToggleLayer,
  }} />

  return (
    <div style={{
      flex: 1, display: 'grid', overflow: 'hidden',
      gridTemplateColumns: '300px 1fr 300px',
      gridTemplateRows: '1fr',
      gap: 0,
    }}>
      {/* ── Left panel ── */}
      <aside style={{
        gridRow: '1 / 2',
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
          callsign={callsign}
          onAircraftChange={onAircraftChange}
          onAltitudeChange={onAltitudeChange}
          onCallsignChange={onCallsignChange}
          onDepartureChange={onDepartureChange}
          onArrivalChange={onArrivalChange}
          onAlternateChange={onAlternateChange}
          onCalculate={onCalculate}
          onNavigate={onNavigate}
          onSIDChange={onSIDChange}
          onSTARChange={onSTARChange}
        />
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
          onRetry={onRetry}
          route={route}
          alternate={alternate}
          selectedAircraftProfile={selectedAircraftProfile}
        />
        {alternatives && alternatives.length > 0 && (
          <AlternativesPanel alternatives={alternatives} onSelect={onSelectAlternative} />
        )}
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
            enabledLayers={enabledLayers}
            onToggleLayer={onToggleLayer}
          />

          {/* ── Route drawer ── */}
          {route && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              zIndex: 450,
              display: 'flex', flexDirection: 'column',
              transform: drawerOpen ? 'translateY(0)' : 'translateY(calc(100% - 34px))',
              transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
            }}>
              {/* Handle */}
              <button
                onClick={() => setDrawerOpen(o => !o)}
                style={{
                  height: 34, flexShrink: 0,
                  background: 'rgba(13,18,41,.94)',
                  backdropFilter: 'blur(12px)',
                  border: 'none',
                  borderTop: '1px solid rgba(244,247,255,.14)',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0 16px', cursor: 'pointer', width: '100%',
                }}
              >
                <span style={{
                  fontSize: 9, color: 'var(--muted)',
                  display: 'inline-block',
                  transform: drawerOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform .25s',
                }}>▲</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Route
                </span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--dim)' }}>
                  {route.waypoints?.filter(w => w.type === 'fix').length ?? 0} waypoints
                  {route.routeDistanceNm ? ` · ${route.routeDistanceNm} NM` : ''}
                </span>
              </button>

              {/* Content */}
              <div style={{
                background: 'rgba(7,7,22,.96)',
                backdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(244,247,255,.08)',
                maxHeight: '42vh',
                overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: '10px 12px 14px',
              }}>
                <RouteTextBox route={route} selectedSID={selectedSID} selectedSTAR={selectedSTAR} />
                <WaypointTable route={route} selectedSID={selectedSID} selectedSTAR={selectedSTAR} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Right panel ── */}
      <aside style={{
        gridRow: '1 / 2',
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
          callsign={callsign}
        />

        <FuelPanel
          route={route}
          arrival={arrival}
          alternate={alternate}
          selectedAircraftProfile={selectedAircraftProfile}
          cruisingAltitude={cruisingAltitude}
        />

        <EtopsPanel
          departure={departure}
          arrival={arrival}
          route={route}
          aircraftProfile={selectedAircraftProfile}
        />

        <WeatherPanel departure={departure} arrival={arrival} />
      </aside>
    </div>
  )
}

// ── Narrow (tablet / mobile) layout ────────────────────────────────────────────

function NarrowLayout({
  departure, arrival, alternate, route, selectedSID, selectedSTAR, routeState, selectedAircraftProfile,
  cruisingAltitude, callsign, onAircraftChange, onAltitudeChange, onCallsignChange, onDepartureChange, onArrivalChange,
  onAlternateChange, onCalculate, onRetry, onNavigate, onSIDChange, onSTARChange, routeWarning, routeConfigError, alternatives,
  onSelectAlternative, enabledLayers, onToggleLayer,
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
          callsign={callsign}
          onAircraftChange={onAircraftChange}
          onAltitudeChange={onAltitudeChange}
          onCallsignChange={onCallsignChange}
          onDepartureChange={onDepartureChange}
          onArrivalChange={onArrivalChange}
          onAlternateChange={onAlternateChange}
          onCalculate={onCalculate}
          onNavigate={onNavigate}
          onSIDChange={onSIDChange}
          onSTARChange={onSTARChange}
        />

        {alternatives && alternatives.length > 0 && (
          <AlternativesPanel alternatives={alternatives} onSelect={onSelectAlternative} />
        )}
      </div>

      {/* Notifications above map */}
      <div style={{ padding: '8px 16px 0' }}>
        <NotificationBar
          routeWarning={routeWarning}
          routeConfigError={routeConfigError}
          onRetry={onRetry}
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
          enabledLayers={enabledLayers}
          onToggleLayer={onToggleLayer}
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
          callsign={callsign}
        />

        <FuelPanel
          route={route}
          arrival={arrival}
          alternate={alternate}
          selectedAircraftProfile={selectedAircraftProfile}
          cruisingAltitude={cruisingAltitude}
        />

        <EtopsPanel
          departure={departure}
          arrival={arrival}
          route={route}
          aircraftProfile={selectedAircraftProfile}
        />

        <WeatherPanel departure={departure} arrival={arrival} />
      </div>
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

import FlightInput   from './FlightInput.tsx'
import WeatherPanel  from './WeatherPanel.tsx'
import AIPanel       from './AIPanel.tsx'
import WaypointTable from './WaypointTable.tsx'
import RouteMap      from './RouteMap.tsx'

export default function MainScreen({
  departure, arrival, route, selectedSID, selectedSTAR, routeState, selectedAircraftProfile,
  onAircraftChange, onDepartureChange, onArrivalChange, onCalculate, onNavigate,
}) {
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
          routeState={routeState}
          selectedSID={selectedSID}
          selectedSTAR={selectedSTAR}
          selectedAircraftProfile={selectedAircraftProfile}
          onAircraftChange={onAircraftChange}
          onDepartureChange={onDepartureChange}
          onArrivalChange={onArrivalChange}
          onCalculate={onCalculate}
          onNavigate={onNavigate}
        />
      </aside>

      {/* ── Map center ── */}
      <main style={{
        gridRow: '1 / 2',
        padding: '16px 12px 8px',
        position: 'relative', overflow: 'hidden',
      }}>
        <RouteMap
          departure={departure}
          arrival={arrival}
          route={route}
          selectedSID={selectedSID}
          selectedSTAR={selectedSTAR}
          routeState={routeState}
          selectedAircraftProfile={selectedAircraftProfile}
        />
        <RangeWarning route={route} selectedAircraftProfile={selectedAircraftProfile} />
      </main>

      {/* ── Waypoint table (below map) ── */}
      <section style={{
        gridColumn: '2 / 3',
        padding: '0 12px 16px',
        overflow: 'hidden',
      }}>
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
        <RangeWarning route={route} selectedAircraftProfile={selectedAircraftProfile} />
        {route ? (
          <AIPanel
            departure={departure}
            arrival={arrival}
            route={route}
            selectedSID={selectedSID}
            selectedSTAR={selectedSTAR}
            selectedAircraftProfile={selectedAircraftProfile}
          />
        ) : (
          <AIEmpty />
        )}

        <WeatherPanel departure={departure} arrival={arrival} />
      </aside>
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

function RangeWarning({ route, selectedAircraftProfile }) {
  if (!route || !selectedAircraftProfile) return null
  const routeNm = route.routeDistanceNm ?? route.waypoints?.[route.waypoints.length - 1]?.distCum
  if (!routeNm || routeNm <= selectedAircraftProfile.maxRangeNm) return null
  const msg = `Warning: Planned route distance exceeds the approximate range of ${selectedAircraftProfile.icaoCode} — ${selectedAircraftProfile.displayName}. Route: ${routeNm.toLocaleString()} NM, approximate range: ${selectedAircraftProfile.maxRangeNm.toLocaleString()} NM.`
  return <div style={{ marginTop: 10, padding: '10px 12px', border: '1px solid rgba(255,180,80,.4)', background: 'var(--amber-soft)', color: 'var(--text)', borderRadius: 'var(--r-sm)', fontSize: 12 }}>{msg}</div>
}

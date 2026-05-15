import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet default icon (Vite issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: null, iconRetinaUrl: null, shadowUrl: null })

const TILE_URL   = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'

function buildRouteCoords(route, selectedSID, selectedSTAR) {
  if (!route?.waypoints?.length) return []

  const dedupePush = (acc, coord) => {
    const last = acc[acc.length - 1]
    if (!last || last[0] !== coord[0] || last[1] !== coord[1]) acc.push(coord)
  }

  const coords = []
  const sidPath = selectedSID?.path ?? []
  const starPath = selectedSTAR?.path ?? []

  if (sidPath.length) sidPath.forEach((coord) => dedupePush(coords, coord))
  else dedupePush(coords, [route.waypoints[0].lat, route.waypoints[0].lon])

  route.waypoints
    .filter((w) => w.type === 'fix')
    .map((w) => [w.lat, w.lon])
    .forEach((coord) => dedupePush(coords, coord))

  if (starPath.length) starPath.forEach((coord) => dedupePush(coords, coord))
  else dedupePush(coords, [route.waypoints[route.waypoints.length - 1].lat, route.waypoints[route.waypoints.length - 1].lon])

  return coords
}

function MapController({ departure, arrival, routeCoords }) {
  const map = useMap()

  useEffect(() => {
    if (!routeCoords?.length) return
    const pts = routeCoords
    const bounds = L.latLngBounds(pts).pad(0.18)
    map.fitBounds(bounds, { animate: true, duration: 0.8 })
  }, [departure?.icao, arrival?.icao, routeCoords, map])

  return null
}

function SIDPath({ sid }) {
  if (!sid?.path) return null
  return (
    <>
      <Polyline
        positions={sid.path}
        pathOptions={{ color: '#8B7CFF', weight: 2, opacity: 0.7, dashArray: '6 4' }}
      />
      {sid.path.map((pos, i) => (
        <CircleMarker key={i} center={pos} radius={3}
          pathOptions={{ color: '#8B7CFF', fillColor: '#8B7CFF', fillOpacity: 0.8, weight: 1 }}
        />
      ))}
    </>
  )
}

function STARPath({ star }) {
  if (!star?.path) return null
  return (
    <>
      <Polyline
        positions={star.path}
        pathOptions={{ color: '#00E5A8', weight: 2, opacity: 0.7, dashArray: '6 4' }}
      />
      {star.path.map((pos, i) => (
        <CircleMarker key={i} center={pos} radius={3}
          pathOptions={{ color: '#00E5A8', fillColor: '#00E5A8', fillOpacity: 0.8, weight: 1 }}
        />
      ))}
    </>
  )
}

export default function RouteMap({ departure, arrival, route, selectedSID, selectedSTAR, routeState }) {
  const initialCenter = departure
    ? [departure.lat, departure.lon]
    : [51.0, 10.0]

  const routeCoords = buildRouteCoords(route, selectedSID, selectedSTAR)

  const airportStyle = (isActive) => ({
    color: isActive ? '#fff' : 'rgba(255,255,255,.5)',
    fillColor: isActive ? '#8B7CFF' : '#444',
    fillOpacity: 1, weight: 2, radius: 7,
  })

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
      <MapContainer
        center={initialCenter}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxZoom={18} />

        {route && routeCoords.length > 1 && (
          <>
            {/* Route shadow glow */}
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: '#8B7CFF', weight: 14, opacity: 0.08 }}
            />
            {/* Main route line */}
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: '#8B7CFF', weight: 2.5, opacity: 0.9 }}
            />

            {/* Waypoint markers */}
            {route.waypoints.map((wp, i) => {
              const isEndpoint = wp.type === 'airport'
              if (isEndpoint) return null
              return (
                <CircleMarker
                  key={`${wp.id}-${i}`}
                  center={[wp.lat, wp.lon]}
                  radius={4}
                  pathOptions={{ color: '#8B7CFF', fillColor: '#8B7CFF', fillOpacity: 0.9, weight: 1.5 }}
                >
                  <Tooltip permanent={false} direction="top" offset={[0, -6]}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{wp.id}</span>
                    {wp.airway && <div style={{ fontSize: 10, opacity: .7 }}>{wp.airway}</div>}
                  </Tooltip>
                </CircleMarker>
              )
            })}
          </>
        )}

        {/* SID / STAR overlay paths */}
        <SIDPath  sid={selectedSID}  />
        <STARPath star={selectedSTAR} />

        {/* Airport markers */}
        {departure && (
          <CircleMarker
            center={[departure.lat, departure.lon]}
            radius={8}
            pathOptions={airportStyle(true)}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{departure.icao}</span>
              <div style={{ fontSize: 10, opacity: .7 }}>DEP</div>
            </Tooltip>
          </CircleMarker>
        )}

        {arrival && (
          <CircleMarker
            center={[arrival.lat, arrival.lon]}
            radius={8}
            pathOptions={{ ...airportStyle(true), fillColor: '#00E5A8', color: '#fff' }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{arrival.icao}</span>
              <div style={{ fontSize: 10, opacity: .7 }}>ARR</div>
            </Tooltip>
          </CircleMarker>
        )}

        <MapController departure={departure} arrival={arrival} routeCoords={routeCoords} />
      </MapContainer>

      {/* Loading overlay */}
      {routeState === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(7,7,22,.65)', backdropFilter: 'blur(4px)', zIndex: 500,
          borderRadius: 'var(--r-xl)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: '3px solid var(--violet-soft)', borderTopColor: 'var(--violet)',
              margin: '0 auto 14px',
              animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Calculating route…
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Analysing weather & airways
            </div>
          </div>
        </div>
      )}

      {/* Map overlay labels */}
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 400,
        display: 'flex', gap: 6, pointerEvents: 'none',
      }}>
        {route && (
          <>
            <MapBadge label={route.altitude}  color="var(--violet)" />
            <MapBadge label={route.aircraft}  color="var(--muted)"  />
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .leaflet-tooltip {
          background: rgba(13,18,41,.92) !important;
          border: 1px solid rgba(244,247,255,.12) !important;
          border-radius: 8px !important;
          color: #F4F7FF !important;
          padding: 5px 8px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,.4) !important;
          font-size: 12px !important;
        }
        .leaflet-tooltip::before { display: none !important; }
      `}</style>
    </div>
  )
}

function MapBadge({ label, color }) {
  return (
    <div style={{
      padding: '5px 10px', borderRadius: 8,
      background: 'rgba(7,7,22,.8)', backdropFilter: 'blur(8px)',
      border: '1px solid rgba(244,247,255,.12)',
      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
      color,
    }}>{label}</div>
  )
}

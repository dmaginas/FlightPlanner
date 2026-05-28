import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import NavDataLayer from './NavDataLayer'
import NatLayer from './NatLayer'
import AirspaceLayer from './AirspaceLayer'
import SigmetLayer from './SigmetLayer'
import EtopsLayer from './EtopsLayer'
import ConflictZoneLayer from './ConflictZoneLayer'

// Fix Leaflet default icon (Vite issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: null, iconRetinaUrl: null, shadowUrl: null })

const TILE_URL   = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
const TILE_ATTR  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'

function buildRouteCoords(route, selectedSID, selectedSTAR) {
  if (!route?.waypoints?.length) return []

  const dedupePush = (acc, coord) => {
    const last = acc[acc.length - 1]
    if (!last || last[0] !== coord[0] || last[1] !== coord[1]) acc.push(coord)
  }

  const coords = []
  const sidPath = selectedSID?.path ?? []
  const starPath = selectedSTAR?.path ?? []

  const first = route.waypoints[0]
  const last  = route.waypoints[route.waypoints.length - 1]

  // Start: last SID waypoint (transition to en-route), or departure airport if no SID.
  // The SID procedure itself is drawn separately as a dashed overlay.
  if (sidPath.length) dedupePush(coords, sidPath[sidPath.length - 1])
  else if (first.lat != null && first.lon != null) dedupePush(coords, [first.lat, first.lon])

  route.waypoints
    .filter((w) => w.type === 'fix' && w.lat != null && w.lon != null)
    .map((w) => [w.lat, w.lon])
    .forEach((coord) => dedupePush(coords, coord))

  // End: first STAR waypoint (transition from en-route), or arrival airport if no STAR.
  // The STAR procedure itself is drawn separately as a dashed overlay.
  if (starPath.length) dedupePush(coords, starPath[0])
  else if (last.lat != null && last.lon != null) dedupePush(coords, [last.lat, last.lon])

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

function SIDPath({ sid, departure }) {
  if (!sid?.path) return null
  const aptCoord: [number, number] | null = departure ? [departure.lat, departure.lon] : null
  const positions = aptCoord ? [aptCoord, ...sid.path] : sid.path
  return (
    <>
      <Polyline positions={positions} pathOptions={{ color: '#fff', weight: 6, opacity: 0.55, dashArray: '8 5' }} />
      <Polyline positions={positions} pathOptions={{ color: '#FF6B00', weight: 3, opacity: 1, dashArray: '8 5' }} />
      {sid.path.map((pos, i) => (
        <CircleMarker key={i} center={pos} radius={4}
          pathOptions={{ color: '#fff', fillColor: '#FF6B00', fillOpacity: 1, weight: 1.5 }}
        />
      ))}
    </>
  )
}

function STARPath({ star, arrival }) {
  if (!star?.path) return null
  const aptCoord: [number, number] | null = arrival ? [arrival.lat, arrival.lon] : null
  const positions = aptCoord ? [...star.path, aptCoord] : star.path
  return (
    <>
      <Polyline positions={positions} pathOptions={{ color: '#fff', weight: 6, opacity: 0.55, dashArray: '8 5' }} />
      <Polyline positions={positions} pathOptions={{ color: '#E8003D', weight: 3, opacity: 1, dashArray: '8 5' }} />
      {star.path.map((pos, i) => (
        <CircleMarker key={i} center={pos} radius={4}
          pathOptions={{ color: '#fff', fillColor: '#E8003D', fillOpacity: 1, weight: 1.5 }}
        />
      ))}
    </>
  )
}

const OWM_KEY = import.meta.env.VITE_OWM_API_KEY as string | undefined

const OWM_LAYERS = [
  { id: 'clouds', label: 'CLOUDS', color: '#93c5fd', owmId: 'clouds_new'        },
  { id: 'precip', label: 'PRECIP', color: '#60a5fa', owmId: 'precipitation_new' },
  { id: 'wind',   label: 'WIND',   color: '#a78bfa', owmId: 'wind_new'          },
  { id: 'temp',   label: 'TEMP',   color: '#f97316', owmId: 'temp_new'          },
  { id: 'press',  label: 'PRESS',  color: '#94a3b8', owmId: 'pressure_new'      },
]

const LAYER_DEFS = [
  { id: 'cflct',  label: 'CFLCT',  color: '#ef4444' },
  { id: 'fir',    label: 'FIR',    color: '#818cf8' },
  { id: 'uir',    label: 'UIR',    color: '#c4b5fd' },
  { id: 'vor',    label: 'VOR',    color: '#7c3aed' },
  { id: 'ndb',    label: 'NDB',    color: '#0369a1' },
  { id: 'fix',    label: 'FIX',    color: '#6b7280' },
  { id: 'airway', label: 'AWY',    color: '#3b82f6' },
  { id: 'nat',    label: 'NAT',    color: '#f59e0b' },
  { id: 'sigmet', label: 'SIGMET', color: '#ef4444' },
  { id: 'etops',  label: 'ETOPS',  color: '#22c55e' },
  ...(OWM_KEY ? OWM_LAYERS.map(({ id, label, color }) => ({ id, label, color })) : []),
] as const

export default function RouteMap({ departure, arrival, alternate, route, selectedSID, selectedSTAR, routeState, selectedAircraftProfile, enabledLayers, onToggleLayer }) {

  const [layersOpen, setLayersOpen] = useState(false)

  const initialCenter = departure
    ? [departure.lat, departure.lon]
    : [51.0, 10.0]

  const routeCoords = useMemo(
    () => buildRouteCoords(route, selectedSID, selectedSTAR),
    [route, selectedSID, selectedSTAR],
  )

  const airportStyle = (isActive) => ({
    color: '#fff',
    fillColor: isActive ? '#1a56db' : '#444',
    fillOpacity: 1, weight: 2.5, radius: 8,
  })

  // FIR and UIR are mutually exclusive — enabling one disables the other
  function handleLayerToggle(id: string) {
    if (id === 'fir' && !enabledLayers?.has('fir') && enabledLayers?.has('uir')) {
      onToggleLayer('uir')
    } else if (id === 'uir' && !enabledLayers?.has('uir') && enabledLayers?.has('fir')) {
      onToggleLayer('fir')
    }
    onToggleLayer(id)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
      <MapContainer
        center={initialCenter}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxZoom={17} />

        {OWM_KEY && OWM_LAYERS.map(layer =>
          enabledLayers?.has(layer.id) ? (
            <TileLayer
              key={layer.id}
              url={`https://tile.openweathermap.org/map/${layer.owmId}/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
              opacity={0.6}
              attribution='&copy; <a href="https://openweathermap.org">OpenWeatherMap</a>'
            />
          ) : null
        )}

        {route && routeCoords.length > 1 && (
          <>
            {/* Route glow */}
            <Polyline positions={routeCoords} pathOptions={{ color: '#1a56db', weight: 18, opacity: 0.15 }} />
            {/* Route halo */}
            <Polyline positions={routeCoords} pathOptions={{ color: '#fff', weight: 9, opacity: 0.6 }} />
            {/* Main route line */}
            <Polyline positions={routeCoords} pathOptions={{ color: '#1a56db', weight: 5, opacity: 1 }} />

            {/* Waypoint markers */}
            {route.waypoints.map((wp, i) => {
              const isEndpoint = wp.type === 'airport'
              if (isEndpoint || wp.lat == null || wp.lon == null) return null
              return (
                <CircleMarker
                  key={`${wp.id}-${i}`}
                  center={[wp.lat, wp.lon]}
                  radius={5}
                  pathOptions={{ color: '#fff', fillColor: '#1a56db', fillOpacity: 1, weight: 2 }}
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

        {/* Alternate leg — dashed amber line from arrival to alternate */}
        {alternate && arrival && (
          <>
            <Polyline
              positions={[[arrival.lat, arrival.lon], [alternate.lat, alternate.lon]]}
              pathOptions={{ color: '#FFB450', weight: 2, opacity: 0.7, dashArray: '8 6' }}
            />
            <CircleMarker
              center={[alternate.lat, alternate.lon]}
              radius={7}
              pathOptions={{ color: '#fff', fillColor: '#FFB450', fillOpacity: 1, weight: 2 }}
            >
              <Tooltip permanent direction="top" offset={[0, -10]}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{alternate.icao}</span>
                <div style={{ fontSize: 10, opacity: .7 }}>ALTN</div>
              </Tooltip>
            </CircleMarker>
          </>
        )}

        {/* SID / STAR overlay paths */}
        <SIDPath  sid={selectedSID}  departure={departure} />
        <STARPath star={selectedSTAR} arrival={arrival} />

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
            pathOptions={{ ...airportStyle(true), fillColor: '#059669' }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{arrival.icao}</span>
              <div style={{ fontSize: 10, opacity: .7 }}>ARR</div>
            </Tooltip>
          </CircleMarker>
        )}

        {enabledLayers?.has('cflct') && <ConflictZoneLayer />}
        <AirspaceLayer enabledLayers={enabledLayers} />
        <NavDataLayer enabledLayers={enabledLayers} />
        <SigmetLayer enabledLayers={enabledLayers} />
        <EtopsLayer
          enabledLayers={enabledLayers}
          departure={departure}
          arrival={arrival}
          route={route}
          aircraftProfile={selectedAircraftProfile}
        />
        <NatLayer
          enabledLayers={enabledLayers}
          departureLon={departure?.lon}
          arrivalLon={arrival?.lon}
        />
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

      {/* Layer toggle panel — bottom-right, spans full available height so list can scroll */}
      <div style={{
        position: 'absolute', top: 16, bottom: 28, right: 12, zIndex: 1000,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        alignItems: 'flex-end', gap: 6,
        pointerEvents: 'none',
      }}>

        {/* Scrollable layer list — shrinks to fit available space */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end',
          overflowY: 'auto',
          maxHeight: layersOpen ? '100%' : 0,
          flexShrink: 1, minHeight: 0,
          transition: 'max-height .25s ease',
          paddingRight: 2,
          pointerEvents: layersOpen ? 'auto' : 'none',
        }}>
          {LAYER_DEFS.map(layer => {
            const on = enabledLayers?.has(layer.id) ?? false
            return (
              <button
                key={layer.id}
                onClick={() => handleLayerToggle(layer.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: on ? 'rgba(13,18,41,.92)' : 'rgba(13,18,41,.6)',
                  border: `1px solid ${on ? layer.color : 'rgba(244,247,255,.15)'}`,
                  color: on ? layer.color : 'rgba(244,247,255,.4)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backdropFilter: 'blur(6px)',
                  letterSpacing: '0.04em',
                  transition: 'all .15s',
                  minWidth: 48,
                  flexShrink: 0,
                }}
              >
                {layer.label}
              </button>
            )
          })}
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setLayersOpen(o => !o)}
          title={layersOpen ? 'Hide layers' : 'Show layers'}
          style={{
            padding: '5px 12px',
            borderRadius: 7,
            background: layersOpen ? 'rgba(13,18,41,.95)' : 'rgba(13,18,41,.75)',
            border: `1px solid ${layersOpen ? 'rgba(244,247,255,.35)' : 'rgba(244,247,255,.18)'}`,
            color: layersOpen ? 'rgba(244,247,255,.9)' : 'rgba(244,247,255,.5)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 6,
            flexShrink: 0, pointerEvents: 'auto',
          }}
        >
          <span style={{ fontSize: 10, transition: 'transform .2s', transform: layersOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▲</span>
          LAYERS
          {(() => {
            const activeCount = LAYER_DEFS.filter(l => enabledLayers?.has(l.id)).length
            return activeCount > 0
              ? <span style={{ background: 'var(--violet)', color: '#fff', borderRadius: 4, fontSize: 9, padding: '1px 5px', fontWeight: 700 }}>{activeCount}</span>
              : null
          })()}
        </button>
      </div>

      {/* Map overlay labels */}
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 400,
        display: 'flex', gap: 6, pointerEvents: 'none',
      }}>
        {route && (
          <>
            <MapBadge label={route.altitude}                               color="var(--violet)" />
            <MapBadge label={route.aircraft}                               color="var(--muted)"  />
            {route.natTrackId && <MapBadge label={`NAT ${route.natTrackId}`} color="#f59e0b" />}
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
          white-space: normal !important;
        }
        .leaflet-tooltip::before { display: none !important; }
        .leaflet-popup-content-wrapper {
          background: rgba(13,18,41,.95) !important;
          border: 1px solid rgba(244,247,255,.12) !important;
          border-radius: 10px !important;
          color: #F4F7FF !important;
          box-shadow: 0 8px 32px rgba(0,0,0,.5) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 12px 14px !important;
          color: #F4F7FF !important;
        }
        .leaflet-popup-tip-container { display: none !important; }
        .leaflet-popup-close-button {
          color: rgba(244,247,255,.5) !important;
          font-size: 18px !important;
          top: 6px !important;
          right: 8px !important;
        }
        .leaflet-popup-close-button:hover { color: #F4F7FF !important; }
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

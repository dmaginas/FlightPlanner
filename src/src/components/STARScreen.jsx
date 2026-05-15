import { useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import { getSTARs } from '../data/mockData.js'

const TILE_URL  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; OpenStreetMap &copy; CARTO'

function ConfBar({ value }) {
  const c = value >= 80 ? 'var(--mint)' : value >= 60 ? 'var(--amber)' : 'var(--red)'
  return (
    <div style={{ height: 3, borderRadius: 2, background: 'var(--line)', overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${value}%`, background: c, borderRadius: 2, transition: 'width .4s' }} />
    </div>
  )
}

function WindBadge({ score }) {
  const map = {
    Favorable: { color: 'var(--mint)',   bg: 'var(--mint-soft)'  },
    Crosswind: { color: 'var(--amber)',  bg: 'var(--amber-soft)' },
    Headwind:  { color: 'var(--amber)',  bg: 'var(--amber-soft)' },
    Tailwind:  { color: 'var(--red)',    bg: 'var(--red-soft)'   },
  }
  const c = map[score] ?? { color: 'var(--muted)', bg: 'var(--glass)' }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600,
      fontFamily: 'var(--font-mono)', color: c.color, background: c.bg,
      border: `1px solid ${c.color}30`, letterSpacing: '0.04em',
    }}>{score}</span>
  )
}

export default function STARScreen({ arrival, route, selectedSTAR, onSelect, onBack }) {
  const stars = getSTARs(arrival?.icao ?? '')
  const [hover, setHover] = useState(null)
  const active = hover ?? selectedSTAR

  const arrCoord = arrival ? [arrival.lat, arrival.lon] : [51.5, 0.0]

  return (
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '340px 1fr', overflow: 'hidden' }}>
      {/* ── Left: STAR list ── */}
      <aside style={{
        borderRight: '1px solid var(--line)',
        padding: '24px 20px', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Back */}
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
            background: 'transparent', border: 'none', padding: 0, width: 'fit-content',
          }}
        >
          <span style={{ fontSize: 16 }}>←</span> Back to Flight Plan
        </button>

        {/* Title */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)' }}>
            Arrival Procedure
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {arrival?.icao ?? '—'} · {arrival?.name ?? ''}
          </div>
        </div>

        {/* AI recommendation chip */}
        {stars.length > 0 && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--r)',
            background: 'var(--mint-soft)', border: '1px solid rgba(0,229,168,.25)',
            fontSize: 12, color: 'var(--muted)', lineHeight: 1.6,
          }}>
            <span style={{ color: 'var(--mint)', fontWeight: 600 }}>AI Dispatcher: </span>
            {stars[0]?.name} is recommended for current arrival weather. Into-wind approach minimises go-around risk.
          </div>
        )}

        {/* STAR cards */}
        {stars.length === 0 ? (
          <div style={{ color: 'var(--dim)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
            No STAR data available for {arrival?.icao ?? 'this airport'}.
          </div>
        ) : (
          stars.map(star => {
            const isSelected = selectedSTAR?.id === star.id
            const isHovered  = hover?.id === star.id
            return (
              <button
                key={star.id}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(star)}
                style={{
                  textAlign: 'left', cursor: 'pointer', width: '100%',
                  padding: '16px', borderRadius: 'var(--r-lg)',
                  background: isSelected ? 'var(--mint-soft)' : isHovered ? 'var(--glass-hover)' : 'var(--glass-2)',
                  border: `1px solid ${isSelected ? 'rgba(0,229,168,.35)' : isHovered ? 'var(--line)' : 'var(--line-2)'}`,
                  transition: 'all .15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: isSelected ? 'var(--mint)' : 'var(--text)', letterSpacing: '0.01em' }}>
                      {star.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>
                      Runway {star.runway} · Final {star.finalAlt}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <WindBadge score={star.windScore} />
                    {isSelected && <span style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 600 }}>✓ Selected</span>}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 8 }}>{star.note}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Confidence: {star.confidence}%
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: star.confidence >= 80 ? 'var(--mint)' : star.confidence >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                    {star.confidence}%
                  </span>
                </div>
                <ConfBar value={star.confidence} />
              </button>
            )
          })
        )}
      </aside>

      {/* ── Right: Map ── */}
      <main style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <MapContainer
            center={arrCoord}
            zoom={8}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
          >
            <TileLayer url={TILE_URL} attribution={TILE_ATTR} />

            {/* Full route as dim reference */}
            {route?.waypoints && (
              <Polyline
                positions={route.waypoints.map(w => [w.lat, w.lon])}
                pathOptions={{ color: '#8B7CFF', weight: 1.5, opacity: 0.25, dashArray: '4 6' }}
              />
            )}

            {/* Active STAR path */}
            {active?.path && (
              <>
                <Polyline
                  positions={active.path}
                  pathOptions={{ color: active.windScore === 'Favorable' ? '#00E5A8' : active.windScore === 'Tailwind' ? '#FF5C72' : '#FFC457', weight: 3, opacity: 0.9 }}
                />
                {active.path.map((pos, i) => {
                  const pathColor = active.windScore === 'Favorable' ? '#00E5A8' : active.windScore === 'Tailwind' ? '#FF5C72' : '#FFC457'
                  return (
                    <CircleMarker key={i} center={pos} radius={5}
                      pathOptions={{ color: '#fff', fillColor: pathColor, fillOpacity: 1, weight: 1.5 }}
                    >
                      {i === 0 && (
                        <Tooltip permanent direction="left" offset={[-8, 0]}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{active.name.split(' ')[0]}</span>
                        </Tooltip>
                      )}
                    </CircleMarker>
                  )
                })}
              </>
            )}

            {/* Arrival airport */}
            {arrival && (
              <CircleMarker
                center={arrCoord} radius={9}
                pathOptions={{ color: '#fff', fillColor: '#00E5A8', fillOpacity: 1, weight: 2 }}
              >
                <Tooltip permanent direction="top" offset={[0, -11]}>
                  <strong style={{ fontFamily: 'monospace' }}>{arrival.icao}</strong>
                  <div style={{ fontSize: 10 }}>Arrival</div>
                </Tooltip>
              </CircleMarker>
            )}
          </MapContainer>
        </div>

        {/* Map info overlay */}
        {active && (
          <div style={{
            position: 'absolute', bottom: 24, left: 24, zIndex: 500,
            background: 'rgba(7,7,22,.88)', backdropFilter: 'blur(12px)',
            border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
            padding: '14px 18px', minWidth: 240,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              {active.name}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <InfoItem label="Runway"    value={active.runway} />
              <InfoItem label="Final Alt" value={active.finalAlt} />
              <InfoItem label="Score"     value={`${active.confidence}%`} color={active.confidence >= 80 ? 'var(--mint)' : 'var(--amber)'} />
            </div>
          </div>
        )}

        <style>{`
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
      </main>
    </div>
  )
}

function InfoItem({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}

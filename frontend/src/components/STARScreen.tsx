import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import { fetchProcedures, toDisplayProcedures, type DisplayProcedure } from '../services/procedureService.ts'
import NavDataLayer from './NavDataLayer.tsx'

const TILE_URL  = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'

const LAYER_DEFS = [
  { id: 'vor',    label: 'VOR',  color: '#7c3aed' },
  { id: 'ndb',    label: 'NDB',  color: '#0369a1' },
  { id: 'fix',    label: 'FIX',  color: '#6b7280' },
  { id: 'airway', label: 'AWY',  color: '#3b82f6' },
] as const

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

export default function STARScreen({ arrival, route, selectedSTAR, onSelect, onBack, enabledLayers, onToggleLayer }) {
  const [stars, setStars] = useState<DisplayProcedure[]>([])
  useEffect(() => {
    if (!arrival?.icao) { setStars([]); return }
    const ctrl = new AbortController()
    fetchProcedures(arrival.icao, ctrl.signal)
      .then(data => setStars(toDisplayProcedures(data.stars)))
      .catch(() => setStars([]))
    return () => ctrl.abort()
  }, [arrival?.icao])

  const [hover, setHover] = useState<DisplayProcedure | null>(null)
  const active = hover ?? selectedSTAR

  const arrCoord = arrival ? [arrival.lat, arrival.lon] : [51.5, 0.0]
  const pathColor = (s: any) =>
    (s as any).windScore === 'Favorable' ? '#00E5A8'
    : (s as any).windScore === 'Tailwind' ? '#FF5C72'
    : '#FFC457'

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

        {/* Recommendation chip */}
        {stars.length > 0 && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--r)',
            background: 'var(--mint-soft)', border: '1px solid rgba(0,229,168,.25)',
            fontSize: 12, color: 'var(--muted)', lineHeight: 1.6,
          }}>
            <span style={{ color: 'var(--mint)', fontWeight: 600 }}>Procedures: </span>
            {stars.length} arrival procedure{stars.length !== 1 ? 's' : ''} available for {arrival?.icao}.
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
                    {(star.runway || (star as any).finalAlt) && (
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>
                        {star.runway && `Runway ${star.runway}`}
                        {star.runway && (star as any).finalAlt && ' · '}
                        {(star as any).finalAlt && `Final ${(star as any).finalAlt}`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    {(star as any).windScore && <WindBadge score={(star as any).windScore} />}
                    {isSelected && <span style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 600 }}>✓ Selected</span>}
                  </div>
                </div>

                {(star as any).note && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 8 }}>{(star as any).note}</div>
                )}

                {(star as any).confidence != null && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Confidence: {(star as any).confidence}%
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: (star as any).confidence >= 80 ? 'var(--mint)' : (star as any).confidence >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                        {(star as any).confidence}%
                      </span>
                    </div>
                    <ConfBar value={(star as any).confidence} />
                  </>
                )}
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
                pathOptions={{ color: '#4a3fbf', weight: 2, opacity: 0.45, dashArray: '4 6' }}
              />
            )}

            {/* Active STAR path */}
            {active?.path && (
              <>
                <Polyline positions={active.path} pathOptions={{ color: '#fff', weight: 7, opacity: 0.55 }} />
                <Polyline positions={active.path} pathOptions={{ color: '#E8003D', weight: 4, opacity: 1 }} />
                {active.path.map((pos, i) => (
                  <CircleMarker key={i} center={pos} radius={5}
                    pathOptions={{ color: '#fff', fillColor: '#E8003D', fillOpacity: 1, weight: 1.5 }}
                  >
                    {i === 0 && (
                      <Tooltip permanent direction="left" offset={[-8, 0]}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{active.name.split(' ')[0]}</span>
                      </Tooltip>
                    )}
                  </CircleMarker>
                ))}
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

            <NavDataLayer enabledLayers={enabledLayers} />
          </MapContainer>
        </div>

        {/* NavData layer toggles */}
        <div style={{
          position: 'absolute', bottom: 28, right: 12, zIndex: 1000,
          display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end',
        }}>
          {LAYER_DEFS.map(layer => {
            const on = enabledLayers.has(layer.id)
            return (
              <button key={layer.id} onClick={() => onToggleLayer(layer.id)} style={{
                padding: '4px 10px', borderRadius: 6,
                background: on ? 'rgba(13,18,41,.92)' : 'rgba(13,18,41,.6)',
                border: `1px solid ${on ? layer.color : 'rgba(244,247,255,.15)'}`,
                color: on ? layer.color : 'rgba(244,247,255,.4)',
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', backdropFilter: 'blur(6px)',
                letterSpacing: '0.04em', transition: 'all .15s', minWidth: 48,
              }}>
                {layer.label}
              </button>
            )
          })}
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
              {active.runway && <InfoItem label="Runway" value={active.runway} />}
              {(active as any).finalAlt    && <InfoItem label="Final Alt" value={(active as any).finalAlt} />}
              {(active as any).confidence != null && <InfoItem label="Score" value={`${(active as any).confidence}%`} color={(active as any).confidence >= 80 ? 'var(--mint)' : 'var(--amber)'} />}
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

function InfoItem({ label, value, color = undefined }) {
  if (!value) return null
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}

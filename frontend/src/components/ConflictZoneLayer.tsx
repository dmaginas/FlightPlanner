import { useState } from 'react'
import { Polygon, Popup } from 'react-leaflet'
import { CONFLICT_ZONES, type ConflictZone } from '../data/conflictZones'

interface HoverState {
  zone: ConflictZone
  lat: number
  lng: number
}

export default function ConflictZoneLayer() {
  const [hover, setHover] = useState<HoverState | null>(null)

  return (
    <>
      {CONFLICT_ZONES.map(zone => (
        <Polygon
          key={zone.id}
          positions={zone.positions as [number, number][]}
          pathOptions={{
            color:       zone.level === 'avoid' ? '#ef4444' : '#f97316',
            fillColor:   zone.level === 'avoid' ? '#ef4444' : '#f97316',
            fillOpacity: 0.10,
            weight:      1.5,
            dashArray:   '5 4',
          }}
          eventHandlers={{
            mouseover: (e) => setHover({ zone, lat: e.latlng.lat, lng: e.latlng.lng }),
            mouseout:  () => setHover(null),
          }}
        />
      ))}

      {hover && (
        <Popup position={[hover.lat, hover.lng]} closeButton={false} autoPan={false}>
          <div style={{ minWidth: 240, maxWidth: 320 }}>
            <div style={{
              fontWeight: 700, fontSize: 13, marginBottom: 6,
              color: hover.zone.level === 'avoid' ? '#ef4444' : '#f97316',
            }}>
              {hover.zone.level === 'avoid' ? '⛔' : '⚠️'} {hover.zone.name}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              {hover.zone.reason}
            </div>
          </div>
        </Popup>
      )}
    </>
  )
}

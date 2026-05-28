import { Polygon, Tooltip } from 'react-leaflet'
import { CONFLICT_ZONES } from '../data/conflictZones'

export default function ConflictZoneLayer() {
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
        >
          <Tooltip>
            <div style={{ maxWidth: 300 }}>
              <strong style={{ color: zone.level === 'avoid' ? '#ef4444' : '#f97316' }}>
                {zone.name}
              </strong>
              <div style={{ fontSize: 11, marginTop: 3 }}>{zone.reason}</div>
            </div>
          </Tooltip>
        </Polygon>
      ))}
    </>
  )
}

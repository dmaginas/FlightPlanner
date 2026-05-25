import { useEffect, useRef, useState } from 'react'
import { useMap, Marker, CircleMarker, Polyline, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { fetchNavData, type NavDataBboxResult } from '../services/navDataService'

const EMPTY: NavDataBboxResult = { vors: [], ndbs: [], fixes: [], airways: [] }

const vorIcon = L.icon({
  iconUrl:    '/icons/vor.svg',
  iconSize:   [20, 20],
  iconAnchor: [10, 10],
})

const ndbIcon = L.icon({
  iconUrl:    '/icons/ndb.svg',
  iconSize:   [18, 18],
  iconAnchor: [9, 9],
})

interface Props {
  enabledLayers: Set<string>
}

export default function NavDataLayer({ enabledLayers }: Props) {
  const map     = useMap()
  const [data, setData]  = useState<NavDataBboxResult>(EMPTY)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [zoom, setZoom]  = useState(map.getZoom())

  useEffect(() => {
    async function fetchVisible() {
      const z      = map.getZoom()
      const bounds = map.getBounds().pad(0.15)

      const types: string[] = []
      if (enabledLayers.has('vor'))                types.push('vor')
      if (enabledLayers.has('ndb')    && z >= 5)   types.push('ndb')
      if (enabledLayers.has('fix')    && z >= 8)   types.push('fix')
      if (enabledLayers.has('airway') && z >= 7)   types.push('airway')

      if (types.length === 0) { setData(EMPTY); return }

      abortRef.current?.abort()
      abortRef.current = new AbortController()

      try {
        const result = await fetchNavData(
          bounds.getSouth(), bounds.getWest(),
          bounds.getNorth(), bounds.getEast(),
          types,
          abortRef.current.signal,
        )
        setData(result)
      } catch {
        // AbortError or network error — ignore
      }
    }

    function schedule() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setZoom(map.getZoom())
        fetchVisible()
      }, 350)
    }

    map.on('moveend', schedule)
    map.on('zoomend', schedule)
    schedule()

    return () => {
      map.off('moveend', schedule)
      map.off('zoomend', schedule)
      if (timerRef.current) clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [map, enabledLayers])

  return (
    <>
      {/* Airways — grey polylines, zoom ≥ 7 */}
      {enabledLayers.has('airway') && zoom >= 7 && data.airways.map((seg, i) => (
        <Polyline
          key={`awy-${i}`}
          positions={[[seg.fromLat, seg.fromLon], [seg.toLat, seg.toLon]]}
          pathOptions={{ color: '#4a5568', weight: 1, opacity: 0.55 }}
        />
      ))}

      {/* Airway labels — mid-segment, rotated along segment direction, zoom ≥ 9 */}
      {enabledLayers.has('airway') && zoom >= 9 && data.airways.map((seg, i) => {
        const midLat = (seg.fromLat + seg.toLat) / 2
        const midLon = (seg.fromLon + seg.toLon) / 2
        const dx = seg.toLon - seg.fromLon
        const dy = -(seg.toLat - seg.fromLat) // flip y: screen y-axis points down
        let angle = Math.atan2(dy, dx) * 180 / Math.PI
        if (angle < -90 || angle > 90) angle += 180 // keep text right-side-up
        const icon = L.divIcon({
          className: '',
          html: `<div style="transform:translate(-50%,-50%);display:inline-block;"><span style="display:inline-block;white-space:nowrap;transform:rotate(${angle.toFixed(1)}deg);font-family:monospace;font-size:9px;color:rgba(148,163,184,0.6);text-shadow:0 0 3px #0d1225,0 0 3px #0d1225;pointer-events:none;letter-spacing:0.03em;">${seg.airway}</span></div>`,
          iconSize:   [0, 0],
          iconAnchor: [0, 0],
        })
        return <Marker key={`awy-lbl-${i}`} position={[midLat, midLon]} icon={icon} interactive={false} />
      })}

      {/* Fixes — small grey dots, zoom ≥ 8 */}
      {enabledLayers.has('fix') && zoom >= 8 && data.fixes.map((fix, i) => (
        <CircleMarker
          key={`fix-${i}`}
          center={[fix.lat, fix.lon]}
          radius={3}
          pathOptions={{ color: '#9ca3af', fillColor: '#9ca3af', fillOpacity: 0.7, weight: 1 }}
        >
          <Tooltip direction="top" offset={[0, -5]}>
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{fix.ident}</span>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* NDBs — custom icon, zoom ≥ 5 */}
      {enabledLayers.has('ndb') && zoom >= 5 && data.ndbs.map((ndb, i) => (
        <Marker key={`ndb-${i}`} position={[ndb.lat, ndb.lon]} icon={ndbIcon}>
          <Tooltip direction="top" offset={[0, -10]}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>{ndb.ident}</span>
            <div style={{ fontSize: 10, opacity: 0.7 }}>{ndb.freqKhz} kHz</div>
          </Tooltip>
        </Marker>
      ))}

      {/* VORs — custom icon, always visible */}
      {enabledLayers.has('vor') && data.vors.map((vor, i) => (
        <Marker key={`vor-${i}`} position={[vor.lat, vor.lon]} icon={vorIcon}>
          <Tooltip direction="top" offset={[0, -11]}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>{vor.ident}</span>
            <div style={{ fontSize: 10, opacity: 0.7 }}>{vor.freqMhz.toFixed(2)} MHz</div>
          </Tooltip>
        </Marker>
      ))}
    </>
  )
}

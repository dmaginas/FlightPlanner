import { useEffect, useRef, useState } from 'react'
import { useMap, CircleMarker, Polyline, Tooltip } from 'react-leaflet'
import { fetchNavData, type NavDataBboxResult } from '../services/navDataService'

const EMPTY: NavDataBboxResult = { vors: [], ndbs: [], fixes: [], airways: [] }

interface Props {
  enabledLayers: Set<string>
}

export default function NavDataLayer({ enabledLayers }: Props) {
  const map      = useMap()
  const [data, setData]    = useState<NavDataBboxResult>(EMPTY)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [zoom, setZoom]    = useState(map.getZoom())

  useEffect(() => {
    async function fetchVisible() {
      const z      = map.getZoom()
      const bounds = map.getBounds().pad(0.15)

      const types: string[] = []
      if (enabledLayers.has('vor'))                    types.push('vor')
      if (enabledLayers.has('ndb')    && z >= 5)       types.push('ndb')
      if (enabledLayers.has('fix')    && z >= 8)       types.push('fix')
      if (enabledLayers.has('airway') && z >= 7)       types.push('airway')

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
        >
          <Tooltip direction="top" sticky>
            <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{seg.airway}</span>
          </Tooltip>
        </Polyline>
      ))}

      {/* Fixes — small grey triangles, zoom ≥ 8 */}
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

      {/* NDBs — cyan, zoom ≥ 5 */}
      {enabledLayers.has('ndb') && zoom >= 5 && data.ndbs.map((ndb, i) => (
        <CircleMarker
          key={`ndb-${i}`}
          center={[ndb.lat, ndb.lon]}
          radius={5}
          pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.85, weight: 1.5 }}
        >
          <Tooltip direction="top" offset={[0, -7]}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>{ndb.ident}</span>
            <div style={{ fontSize: 10, opacity: 0.7 }}>{ndb.freqKhz} kHz</div>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* VORs — violet hexagon-ish, always visible */}
      {enabledLayers.has('vor') && data.vors.map((vor, i) => (
        <CircleMarker
          key={`vor-${i}`}
          center={[vor.lat, vor.lon]}
          radius={6}
          pathOptions={{ color: '#a855f7', fillColor: '#a855f7', fillOpacity: 0.9, weight: 1.5 }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>{vor.ident}</span>
            <div style={{ fontSize: 10, opacity: 0.7 }}>{vor.freqMhz.toFixed(2)} MHz</div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}

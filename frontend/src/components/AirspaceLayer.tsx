import { useEffect, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { fetchAirspaceBoundaries } from '../services/airspaceService'

// Module-level cache — one HTTP fetch per browser session
let _cache: unknown = null

// ── Geometry helpers ──────────────────────────────────────────────────────────

function ringCenter(ring: number[][]): [number, number] {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
  for (const [lon, lat] of ring) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
  }
  return [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
}

function featureCenter(feature: any): [number, number] | null {
  const p = feature?.properties
  const g = feature?.geometry
  // vatspy provides explicit label coordinates
  if (p?.label_lat != null && p?.label_lon != null)
    return [Number(p.label_lat), Number(p.label_lon)]
  if (!g) return null
  if (g.type === 'Polygon'      && g.coordinates?.[0])    return ringCenter(g.coordinates[0])
  if (g.type === 'MultiPolygon' && g.coordinates?.[0]?.[0]) return ringCenter(g.coordinates[0][0])
  return null
}

// ── Layer factory ─────────────────────────────────────────────────────────────

function makeLabelIcon(text: string, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-50%);font-family:monospace;font-size:9px;font-weight:700;color:${color};text-shadow:0 0 3px #070716,0 0 3px #070716,0 0 3px #070716;pointer-events:none;letter-spacing:0.06em;white-space:nowrap;">${text}</div>`,
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
  })
}

function buildLayer(data: unknown, style: L.PathOptions, labelColor: string): L.GeoJSON {
  const layer = L.geoJSON(data as any, { style: () => style })

  // Add a permanent label at each polygon centroid
  layer.eachLayer((featureLayer: any) => {
    const id: string = featureLayer.feature?.properties?.id ?? ''
    const pos = featureCenter(featureLayer.feature)
    if (!id || !pos) return
    layer.addLayer(
      L.marker(pos, { icon: makeLabelIcon(id, labelColor), interactive: false }),
    )
  })

  return layer
}

// ── Styles ────────────────────────────────────────────────────────────────────

const FIR_STYLE: L.PathOptions = { color: '#818cf8', weight: 1.5, opacity: 0.65, fillOpacity: 0.04 }
const UIR_STYLE: L.PathOptions = { color: '#c4b5fd', weight: 1,   opacity: 0.5,  fillOpacity: 0, dashArray: '7 5' }

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { enabledLayers?: Set<string> }

export default function AirspaceLayer({ enabledLayers }: Props) {
  const map = useMap()
  const [data, setData] = useState<unknown>(_cache)
  const firRef = useRef<L.GeoJSON | null>(null)
  const uirRef = useRef<L.GeoJSON | null>(null)

  const firOn = enabledLayers?.has('fir') ?? false
  const uirOn = enabledLayers?.has('uir') ?? false

  // Lazy-fetch — only when first enabled, skipped if already cached
  useEffect(() => {
    if (data || (!firOn && !uirOn)) return
    fetchAirspaceBoundaries()
      .then(d => { _cache = d; setData(d) })
      .catch(err => console.warn('FIR/UIR boundary fetch failed:', err))
  }, [firOn, uirOn]) // eslint-disable-line react-hooks/exhaustive-deps

  // FIR layer: build once, add/remove imperatively
  useEffect(() => {
    if (!data) return
    firRef.current ??= buildLayer(data, FIR_STYLE, '#818cf8')
    if (firOn) map.addLayer(firRef.current)
    else       map.removeLayer(firRef.current)
    return () => { if (firRef.current) map.removeLayer(firRef.current) }
  }, [firOn, data, map])

  // UIR layer: build once, add/remove imperatively
  useEffect(() => {
    if (!data) return
    uirRef.current ??= buildLayer(data, UIR_STYLE, '#c4b5fd')
    if (uirOn) map.addLayer(uirRef.current)
    else       map.removeLayer(uirRef.current)
    return () => { if (uirRef.current) map.removeLayer(uirRef.current) }
  }, [uirOn, data, map])

  return null
}

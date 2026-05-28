import { useEffect, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { fetchAirspaceBoundaries } from '../services/airspaceService'

// Module-level cache — one HTTP fetch per browser session
let _cache: unknown = null

const LABEL_MIN_ZOOM = 4

// ── Geometry helpers ──────────────────────────────────────────────────────────

function longestEdgeInfo(ring: number[][]): { pos: [number, number]; angle: number } | null {
  if (ring.length < 2) return null
  let bestLen = -1
  let bestMidLat = 0, bestMidLon = 0, bestAngle = 0

  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i]
    const [lon2, lat2] = ring[i + 1]
    const dLon = lon2 - lon1
    const dLat = lat2 - lat1
    const len = dLon * dLon + dLat * dLat
    if (len > bestLen) {
      bestLen = len
      bestMidLat = (lat1 + lat2) / 2
      bestMidLon = (lon1 + lon2) / 2
      let angle = Math.atan2(-(dLat), dLon) * 180 / Math.PI
      if (angle < -90 || angle > 90) angle += 180
      bestAngle = angle
    }
  }

  if (bestLen < 0) return null
  return { pos: [bestMidLat, bestMidLon], angle: bestAngle }
}

function featureLabelInfo(feature: any): { pos: [number, number]; angle: number } | null {
  const g = feature?.geometry
  if (!g) return null

  let ring: number[][] | null = null
  if (g.type === 'Polygon' && g.coordinates?.[0]) {
    ring = g.coordinates[0]
  } else if (g.type === 'MultiPolygon' && g.coordinates?.length) {
    // Pick largest polygon by bbox area
    let bestArea = -1
    for (const poly of g.coordinates) {
      if (!poly?.[0]?.length) continue
      let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
      for (const [lon, lat] of poly[0]) {
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
      }
      const area = (maxLat - minLat) * (maxLon - minLon)
      if (area > bestArea) { bestArea = area; ring = poly[0] }
    }
  }

  if (!ring) return null
  return longestEdgeInfo(ring)
}

// ── Label factory ─────────────────────────────────────────────────────────────

function makeLabelIcon(text: string, color: string, angle: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-50%);display:inline-block;"><span style="display:inline-block;white-space:nowrap;transform:rotate(${angle.toFixed(1)}deg);font-family:monospace;font-size:9px;font-weight:700;color:${color};text-shadow:0 0 3px #070716,0 0 3px #070716,0 0 3px #070716;pointer-events:none;letter-spacing:0.06em;">${text}</span></div>`,
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
  })
}

// ── Layer factory ─────────────────────────────────────────────────────────────

function buildLayers(
  data: unknown,
  style: L.PathOptions,
  labelColor: string,
): [L.GeoJSON, L.LayerGroup] {
  const polyLayer = L.geoJSON(data as any, { style: () => style })
  const labelGroup = L.layerGroup()

  polyLayer.eachLayer((featureLayer: any) => {
    const id: string = featureLayer.feature?.properties?.id ?? ''
    const info = featureLabelInfo(featureLayer.feature)
    if (!id || !info) return
    labelGroup.addLayer(
      L.marker(info.pos, { icon: makeLabelIcon(id, labelColor, info.angle), interactive: false }),
    )
  })

  return [polyLayer, labelGroup]
}

// ── Styles ────────────────────────────────────────────────────────────────────

const FIR_STYLE: L.PathOptions = { color: '#818cf8', weight: 1.5, opacity: 0.65, fillOpacity: 0.04 }
const UIR_STYLE: L.PathOptions = { color: '#c4b5fd', weight: 1,   opacity: 0.5,  fillOpacity: 0, dashArray: '7 5' }

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { enabledLayers?: Set<string> }

export default function AirspaceLayer({ enabledLayers }: Props) {
  const map = useMap()
  const [data, setData] = useState<unknown>(_cache)

  const firPolyRef  = useRef<L.GeoJSON | null>(null)
  const firLabelRef = useRef<L.LayerGroup | null>(null)
  const uirPolyRef  = useRef<L.GeoJSON | null>(null)
  const uirLabelRef = useRef<L.LayerGroup | null>(null)

  const firOn = enabledLayers?.has('fir') ?? false
  const uirOn = enabledLayers?.has('uir') ?? false

  // Lazy-fetch — only when first enabled, skipped if already cached
  useEffect(() => {
    if (data || (!firOn && !uirOn)) return
    fetchAirspaceBoundaries()
      .then(d => { _cache = d; setData(d) })
      .catch(err => console.warn('FIR/UIR boundary fetch failed:', err))
  }, [firOn, uirOn]) // eslint-disable-line react-hooks/exhaustive-deps

  // FIR layer
  useEffect(() => {
    if (!data) return

    if (!firPolyRef.current) {
      const [poly, labels] = buildLayers(data, FIR_STYLE, '#818cf8')
      firPolyRef.current  = poly
      firLabelRef.current = labels
    }

    if (firOn) {
      map.addLayer(firPolyRef.current)
    } else {
      map.removeLayer(firPolyRef.current)
      if (firLabelRef.current) map.removeLayer(firLabelRef.current)
      return
    }

    const updateLabels = () => {
      if (!firLabelRef.current) return
      if (firOn && map.getZoom() >= LABEL_MIN_ZOOM) map.addLayer(firLabelRef.current)
      else map.removeLayer(firLabelRef.current)
    }
    updateLabels()
    map.on('zoomend', updateLabels)

    return () => {
      map.off('zoomend', updateLabels)
      if (firPolyRef.current)  map.removeLayer(firPolyRef.current)
      if (firLabelRef.current) map.removeLayer(firLabelRef.current)
    }
  }, [firOn, data, map])

  // UIR layer
  useEffect(() => {
    if (!data) return

    if (!uirPolyRef.current) {
      const [poly, labels] = buildLayers(data, UIR_STYLE, '#c4b5fd')
      uirPolyRef.current  = poly
      uirLabelRef.current = labels
    }

    if (uirOn) {
      map.addLayer(uirPolyRef.current)
    } else {
      map.removeLayer(uirPolyRef.current)
      if (uirLabelRef.current) map.removeLayer(uirLabelRef.current)
      return
    }

    const updateLabels = () => {
      if (!uirLabelRef.current) return
      if (uirOn && map.getZoom() >= LABEL_MIN_ZOOM) map.addLayer(uirLabelRef.current)
      else map.removeLayer(uirLabelRef.current)
    }
    updateLabels()
    map.on('zoomend', updateLabels)

    return () => {
      map.off('zoomend', updateLabels)
      if (uirPolyRef.current)  map.removeLayer(uirPolyRef.current)
      if (uirLabelRef.current) map.removeLayer(uirLabelRef.current)
    }
  }, [uirOn, data, map])

  return null
}

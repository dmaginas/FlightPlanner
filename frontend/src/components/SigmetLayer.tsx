import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { fetchAllSigmets, SigmetItem } from '../services/sigmetService'

const HAZARD_COLOR: Record<string, string> = {
  'CONVECTIVE': '#ef4444',
  'TS':         '#ef4444',
  'TURB':       '#f97316',
  'SEV TURB':   '#f97316',
  'ICE':        '#06b6d4',
  'SEV ICE':    '#06b6d4',
  'IFR':        '#a855f7',
  'MTN OBSCN':  '#78716c',
  'LLWS':       '#eab308',
  'VA':         '#d946ef',
}
const DEFAULT_COLOR = '#f59e0b'

function hazardColor(hazard: string): string {
  return HAZARD_COLOR[hazard?.toUpperCase?.()] ?? DEFAULT_COLOR
}

function buildPopupHtml(item: SigmetItem): string {
  const altLow  = item.altLowFt  != null ? `${item.altLowFt.toLocaleString()} ft`  : '—'
  const altHigh = item.altHighFt != null ? `${item.altHighFt.toLocaleString()} ft` : '—'
  const validTo = item.validTo
    ? new Date(item.validTo).toUTCString().replace(/^[A-Z][a-z]+,\s/, '')
    : '—'
  const color = hazardColor(item.hazard)
  return `
    <div style="font-family:monospace;min-width:200px;max-width:320px">
      <div style="font-weight:700;font-size:13px;margin-bottom:6px">
        <span style="color:${color}">${item.type}</span>
        &nbsp;&middot;&nbsp;${item.hazard}${item.severity ? ` (${item.severity})` : ''}
      </div>
      <div style="font-size:11px;opacity:.75;margin-bottom:2px">Alt: ${altLow} – ${altHigh}</div>
      <div style="font-size:11px;opacity:.75;margin-bottom:8px">Valid to: ${validTo}</div>
      <div style="font-size:10px;line-height:1.5;opacity:.85;word-break:break-word">${item.rawText}</div>
    </div>
  `
}

interface Props {
  enabledLayers?: Set<string>
}

export default function SigmetLayer({ enabledLayers }: Props) {
  const map = useMap()
  const [items, setItems] = useState<SigmetItem[]>([])

  const sigmetOn = enabledLayers?.has('sigmet') ?? false

  useEffect(() => {
    if (!sigmetOn) { setItems([]); return }
    const controller = new AbortController()
    fetchAllSigmets(controller.signal)
      .then(r => setItems(r.items ?? []))
      .catch(err => { if (err?.name !== 'AbortError') console.warn('SIGMET fetch failed:', err) })
    return () => controller.abort()
  }, [sigmetOn])

  useEffect(() => {
    if (!sigmetOn || items.length === 0) return

    const group = L.layerGroup()
    for (const item of items) {
      if (!item.coords?.length) continue
      const color = hazardColor(item.hazard)
      const poly = L.polygon(item.coords, {
        color,
        weight: 1.5,
        opacity: 0.85,
        fillColor: color,
        fillOpacity: 0.15,
      })
      poly.bindPopup(buildPopupHtml(item), { maxWidth: 340 })
      group.addLayer(poly)
    }
    map.addLayer(group)
    return () => { map.removeLayer(group) }
  }, [sigmetOn, items, map])

  return null
}

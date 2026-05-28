import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { getEtopsInfo, analyseEtopsRoute, findEtopsKeyPoints } from '../utils/etopsUtils'

const NM_TO_M = 1852

interface Props {
  enabledLayers?:  Set<string>
  departure?:      { lat: number; lon: number; icao: string } | null
  arrival?:        { lat: number; lon: number; icao: string } | null
  route?:          { waypoints: Array<{ lat?: number | null; lon?: number | null; type?: string }> } | null
  aircraftProfile?: { icaoCode: string; cruiseSpeedKts: number } | null
}

function squareIcon(color: string, label: string) {
  return L.divIcon({
    html: `<div style="
      display:flex;flex-direction:column;align-items:center;gap:3px;
      pointer-events:none;
    ">
      <div style="
        width:12px;height:12px;
        background:${color};
        border:2px solid #fff;
        border-radius:2px;
        box-shadow:0 0 8px ${color}99;
      "></div>
      <div style="
        background:rgba(13,18,41,.88);
        color:${color};
        font-family:monospace;font-size:9px;font-weight:700;
        padding:1px 4px;border-radius:3px;
        border:1px solid ${color}55;
        white-space:nowrap;
      ">${label}</div>
    </div>`,
    className: '',
    iconSize:   [40, 30],
    iconAnchor: [20, 6],
  })
}

function diamondIcon() {
  return L.divIcon({
    html: `<div style="
      display:flex;flex-direction:column;align-items:center;gap:3px;
      pointer-events:none;
    ">
      <div style="
        width:13px;height:13px;
        background:#f59e0b;
        transform:rotate(45deg);
        border:2px solid #fff;
        border-radius:2px;
        box-shadow:0 0 8px #f59e0b99;
      "></div>
      <div style="
        background:rgba(13,18,41,.88);
        color:#f59e0b;
        font-family:monospace;font-size:9px;font-weight:700;
        padding:1px 4px;border-radius:3px;
        border:1px solid #f59e0b55;
        white-space:nowrap;
        margin-top:4px;
      ">ETP</div>
    </div>`,
    className: '',
    iconSize:   [40, 32],
    iconAnchor: [20, 6],
  })
}

export default function EtopsLayer({ enabledLayers, departure, arrival, route, aircraftProfile }: Props) {
  const map     = useMap()
  const etopsOn = enabledLayers?.has('etops') ?? false

  useEffect(() => {
    if (!etopsOn || !departure || !arrival || !route?.waypoints?.length || !aircraftProfile) return

    const etops = getEtopsInfo(aircraftProfile)
    if (!etops.applicable) return

    const analysis  = analyseEtopsRoute(departure, arrival, route.waypoints, etops.radiusNm, etops.oeiSpeedKts)
    const keyPoints = findEtopsKeyPoints(departure, arrival, route.waypoints, etops.radiusNm)

    const group = L.layerGroup()
    const fmtMin = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`

    // ── Coverage circles (DEP + ARR) ─────────────────────────────────────────

    const circleStyle = {
      radius:      etops.radiusNm * NM_TO_M,
      color:       '#22c55e',
      weight:      2,
      opacity:     0.7,
      fillColor:   '#22c55e',
      fillOpacity: 0.07,
      dashArray:   '8 6',
    }

    L.circle([departure.lat, departure.lon], circleStyle)
      .bindTooltip(
        `<b>${departure.icao}</b> — ETOPS-${etops.etopsMinutes}<br/>Diversion radius: ${etops.radiusNm} NM`,
        { sticky: true },
      )
      .addTo(group)

    L.circle([arrival.lat, arrival.lon], circleStyle)
      .bindTooltip(
        `<b>${arrival.icao}</b> — ETOPS-${etops.etopsMinutes}<br/>Diversion radius: ${etops.radiusNm} NM`,
        { sticky: true },
      )
      .addTo(group)

    // ── Gap segment (route between EEP and EXP) ──────────────────────────────

    if (keyPoints.gapCoords.length >= 2) {
      // White glow
      L.polyline(keyPoints.gapCoords, { color: '#fff', weight: 9, opacity: 0.25 }).addTo(group)
      // Orange overlay
      L.polyline(keyPoints.gapCoords, { color: '#f97316', weight: 4, opacity: 0.95 }).addTo(group)
    }

    // ── EEP marker ───────────────────────────────────────────────────────────

    if (keyPoints.eep) {
      const depDistNm = analysis.depCoverageNm
      L.marker(keyPoints.eep, { icon: squareIcon('#f97316', 'EEP') })
        .bindPopup(`
          <div style="font-family:monospace;min-width:180px">
            <div style="font-weight:700;font-size:12px;margin-bottom:6px;color:#f97316">
              ETOPS Entry Point
            </div>
            <div style="font-size:11px;opacity:.8;margin-bottom:2px">Last point covered by ${departure.icao}</div>
            <div style="font-size:11px;opacity:.8;margin-bottom:6px">~${depDistNm} NM from ${departure.icao}</div>
            <div style="font-size:10px;opacity:.55">Gap begins here — ${analysis.gapNm} NM uncovered</div>
          </div>
        `, { maxWidth: 260 })
        .addTo(group)
    }

    // ── EXP marker ───────────────────────────────────────────────────────────

    if (keyPoints.exp) {
      const arrDistNm = analysis.arrCoverageNm
      L.marker(keyPoints.exp, { icon: squareIcon('#f97316', 'EXP') })
        .bindPopup(`
          <div style="font-family:monospace;min-width:180px">
            <div style="font-weight:700;font-size:12px;margin-bottom:6px;color:#f97316">
              ETOPS Exit Point
            </div>
            <div style="font-size:11px;opacity:.8;margin-bottom:2px">First point covered by ${arrival.icao}</div>
            <div style="font-size:11px;opacity:.8;margin-bottom:6px">~${arrDistNm} NM from ${arrival.icao}</div>
            <div style="font-size:10px;opacity:.55">Gap ends here</div>
          </div>
        `, { maxWidth: 260 })
        .addTo(group)
    }

    // ── ETP marker ───────────────────────────────────────────────────────────

    if (analysis.etp) {
      const { lat, lon, distFromDepNm, timeToDepMin, timeToArrMin } = analysis.etp
      L.marker([lat, lon], { icon: diamondIcon() })
        .bindPopup(`
          <div style="font-family:monospace;min-width:190px">
            <div style="font-weight:700;font-size:12px;margin-bottom:6px;color:#f59e0b">
              Equal Time Point (ETP)
            </div>
            <div style="font-size:11px;opacity:.8;margin-bottom:2px">Dist. from ${departure.icao}: ${distFromDepNm} NM</div>
            <div style="font-size:11px;opacity:.8;margin-bottom:6px">Dist. from ${arrival.icao}: ${analysis.totalDistNm - distFromDepNm} NM</div>
            <div style="font-size:11px;opacity:.8;margin-bottom:2px">→ ${departure.icao} (OEI): ${fmtMin(timeToDepMin)}</div>
            <div style="font-size:11px;opacity:.8;margin-bottom:6px">→ ${arrival.icao} (OEI): ${fmtMin(timeToArrMin)}</div>
            <div style="font-size:10px;opacity:.5">Simplified — no wind correction</div>
          </div>
        `, { maxWidth: 280 })
        .addTo(group)
    }

    map.addLayer(group)
    return () => { map.removeLayer(group) }
  }, [etopsOn, departure, arrival, route, aircraftProfile, map])

  return null
}

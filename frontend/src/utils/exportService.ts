/**
 * exportService.ts — OFP PDF and MSFS .pln export for FlightPlanner.
 *
 * exportOFP   → Generates a formatted A4 Operational Flight Plan PDF (simulation only).
 * exportMsfsPln → Generates a Microsoft Flight Simulator 2020/2024 .pln XML file.
 */

import { calculateFuel } from './fuelCalculator.ts'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ExportData {
  departure:   { icao: string; name?: string; lat: number; lon: number; elevation?: number }
  arrival:     { icao: string; name?: string; lat: number; lon: number; elevation?: number }
  alternate?:  { icao: string; name?: string; lat: number; lon: number } | null
  route:       {
    altitude?: string
    aircraft?: string
    airway?: string
    routeDistanceNm?: number
    etaMinutes?: number
    waypoints: { id: string; lat?: number; lon?: number; type?: string; airway?: string; distCum?: number }[]
  }
  aircraftProfile?: {
    icaoCode: string
    displayName: string
    cruiseSpeedKts: number
    fuelBurnTonPerHour: number
    preferredCruiseAltitudeFt: number
    climbRateFpm: number
    descentRateFpm: number
  } | null
  selectedSID?:  { name: string } | null
  selectedSTAR?: { name: string } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function utcNow(): string {
  const d = new Date()
  return d.toUTCString().replace(' GMT', 'Z')
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── OFP PDF ────────────────────────────────────────────────────────────────────

export async function exportOFP(data: ExportData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { departure, arrival, alternate, route, aircraftProfile, selectedSID, selectedSTAR } = data

  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W    = 210
  const MARGIN = 14
  const COL  = W - MARGIN * 2
  let y      = MARGIN

  const distNm = route.routeDistanceNm ?? route.waypoints?.[route.waypoints.length - 1]?.distCum ?? 0

  const altDistNm = (arrival && alternate)
    ? haversineNm(arrival.lat, arrival.lon, alternate.lat, alternate.lon)
    : undefined

  const fuel = aircraftProfile && distNm
    ? calculateFuel({ distanceNm: distNm, aircraftProfile, windComponentKts: 0, altDistanceNm: altDistNm })
    : null

  // ── Helpers ────────────────────────────────────────────────────────────────

  function line(w = 0.2) {
    doc.setDrawColor(80, 80, 100)
    doc.setLineWidth(w)
    doc.line(MARGIN, y, W - MARGIN, y)
    y += 3
  }

  function section(title: string) {
    y += 2
    doc.setFillColor(30, 30, 50)
    doc.rect(MARGIN, y, COL, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(180, 170, 255)
    doc.text(title.toUpperCase(), MARGIN + 3, y + 4)
    y += 9
    doc.setTextColor(40, 40, 60)
  }

  function kv(key: string, value: string, x = MARGIN, colW = COL / 2) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 140)
    doc.text(key, x, y)
    doc.setFont('courier', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(20, 20, 40)
    doc.text(value, x + colW * 0.45, y)
  }

  function kvRow(pairs: [string, string][]) {
    const colW = COL / pairs.length
    pairs.forEach(([k, v], i) => kv(k, v, MARGIN + i * colW, colW))
    y += 7
  }

  function checkPage(needed = 20) {
    if (y + needed > 280) {
      doc.addPage()
      y = MARGIN
    }
  }

  // ── Header ─────────────────────────────────────────────────────────────────

  doc.setFillColor(15, 15, 35)
  doc.rect(0, 0, W, 22, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(139, 124, 255)
  doc.text('FlightPlanner', MARGIN, 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(160, 160, 180)
  doc.text('OPERATIONAL FLIGHT PLAN — SIMULATION USE ONLY', MARGIN, 16)

  doc.setFont('courier', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(`${departure.icao} → ${arrival.icao}`, W - MARGIN, 11, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(140, 140, 160)
  doc.text(utcNow(), W - MARGIN, 17, { align: 'right' })

  y = 28

  // ── Flight Details ─────────────────────────────────────────────────────────

  section('Flight Details')
  kvRow([['Departure', departure.icao + (departure.name ? ` — ${departure.name}` : '')], ['Destination', arrival.icao + (arrival.name ? ` — ${arrival.name}` : '')]])
  kvRow([['Aircraft', aircraftProfile ? `${aircraftProfile.icaoCode} — ${aircraftProfile.displayName}` : (route.aircraft ?? '—')], ['Alternate', alternate ? alternate.icao + (alternate.name ? ` — ${alternate.name}` : '') : 'None']])
  kvRow([['Cruise Alt', route.altitude ?? '—'], ['Route Type', 'IFR']])
  kvRow([['SID', selectedSID?.name ?? 'None'], ['STAR', selectedSTAR?.name ?? 'None']])
  kvRow([['Route Distance', `${Math.round(distNm)} NM`], ['Est. En-Route', route.etaMinutes ? formatTime(route.etaMinutes) + ' UTC' : '—']])

  line()

  // ── Fuel Summary ───────────────────────────────────────────────────────────

  if (fuel) {
    section('Fuel Summary')

    const fuelRows: [string, string][][] = [
      [['Taxi',    `${fuel.taxi.fuelTons.toFixed(2)} T`],  ['Climb',         `${fuel.climb.fuelTons.toFixed(2)} T`]],
      [['Cruise',  `${fuel.cruise.fuelTons.toFixed(2)} T`],['Descent',       `${fuel.descent.fuelTons.toFixed(2)} T`]],
      [['Trip Fuel',`${fuel.tripFuel.toFixed(2)} T`],      ['Contingency (5%)',`${fuel.contingency.toFixed(2)} T`]],
      [['Final Res (30 min)', `${fuel.finalReserve.toFixed(2)} T`], ['Alternate', `${fuel.alternate.toFixed(2)} T`]],
    ]
    fuelRows.forEach(row => kvRow(row))

    doc.setFillColor(0, 180, 130)
    doc.rect(MARGIN, y, COL, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL FUEL REQUIRED', MARGIN + 3, y + 5.5)
    doc.setFont('courier', 'bold')
    doc.setFontSize(11)
    doc.text(`${fuel.totalFuel.toFixed(1)} T`, W - MARGIN - 3, y + 5.5, { align: 'right' })
    y += 13
    line()
  }

  // ── Waypoint Table ─────────────────────────────────────────────────────────

  checkPage(30)
  section('Route — Waypoints')

  const cols = { ident: MARGIN, type: MARGIN + 22, airway: MARGIN + 38, lat: MARGIN + 60, lon: MARGIN + 88, dist: MARGIN + 116 }

  doc.setFillColor(45, 45, 70)
  doc.rect(MARGIN, y, COL, 5.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(180, 170, 255)
  ;[['IDENT', cols.ident], ['TYPE', cols.type], ['AIRWAY', cols.airway],
    ['LAT', cols.lat], ['LON', cols.lon], ['CUM DIST', cols.dist]].forEach(([t, x]) => {
    doc.text(t as string, x as number, y + 3.8)
  })
  y += 7

  doc.setFont('courier', 'normal')
  doc.setFontSize(7.5)

  route.waypoints.forEach((wp, i) => {
    checkPage(6)
    const isAirport = wp.type === 'airport'
    if (isAirport) {
      doc.setFillColor(25, 25, 45)
      doc.rect(MARGIN, y - 1, COL, 5.5, 'F')
    }
    doc.setTextColor(isAirport ? 200 : 80, isAirport ? 195 : 80, isAirport ? 255 : 100)
    doc.setFont('courier', isAirport ? 'bold' : 'normal')

    const lat = wp.lat != null ? `${Math.abs(wp.lat).toFixed(4)}${wp.lat >= 0 ? 'N' : 'S'}` : '—'
    const lon = wp.lon != null ? `${Math.abs(wp.lon).toFixed(4)}${wp.lon >= 0 ? 'E' : 'W'}` : '—'

    doc.text(wp.id ?? '—',              cols.ident,  y + 3)
    doc.text((wp.type ?? '—').toUpperCase().slice(0, 5), cols.type, y + 3)
    doc.text(wp.airway ?? (i === 0 ? 'DEP' : i === route.waypoints.length - 1 ? 'ARR' : 'DCT'), cols.airway, y + 3)
    doc.text(lat,                        cols.lat,    y + 3)
    doc.text(lon,                        cols.lon,    y + 3)
    doc.text(wp.distCum != null ? `${wp.distCum} NM` : '—', cols.dist, y + 3)
    y += 5
  })

  line()

  // ── Disclaimer ─────────────────────────────────────────────────────────────

  checkPage(20)
  y += 4
  doc.setFillColor(60, 20, 20)
  doc.rect(MARGIN, y, COL, 14, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 120, 120)
  doc.text('FOR FLIGHT SIMULATION USE ONLY', MARGIN + 3, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(200, 160, 160)
  doc.text('This document is generated by FlightPlanner for Microsoft Flight Simulator / X-Plane use only.', MARGIN + 3, y + 10)
  doc.text('It must not be used for real-world aviation navigation or flight operations.', MARGIN + 3, y + 14.5)
  y += 19

  // ── Page numbers ───────────────────────────────────────────────────────────

  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 140)
    doc.text(`Page ${p} / ${totalPages}  —  ${departure.icao}→${arrival.icao}  —  FlightPlanner`, W / 2, 293, { align: 'center' })
  }

  const blob = doc.output('blob')
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `OFP_${departure.icao}_${arrival.icao}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── MSFS .pln ──────────────────────────────────────────────────────────────────

function msfsPosition(lat: number, lon: number, elevFt = 0): string {
  const latStr = `${Math.abs(lat).toFixed(6)}${lat >= 0 ? 'N' : 'S'}`
  const lonStr = `${String(Math.floor(Math.abs(lon))).padStart(3, '0')}.${Math.abs(lon).toFixed(6).split('.')[1]}${lon >= 0 ? 'E' : 'W'}`
  const altStr = `${elevFt >= 0 ? '+' : ''}${elevFt.toFixed(2).padStart(8, '0')}`
  return `${latStr},${lonStr},${altStr}`
}

function msfsWaypointType(type?: string): string {
  switch (type?.toLowerCase()) {
    case 'airport': return 'Airport'
    case 'vor':     return 'VOR'
    case 'ndb':     return 'NDB'
    default:        return 'Intersection'
  }
}

export function exportMsfsPln(data: ExportData): void {
  const { departure, arrival, alternate, route } = data

  const cruiseAltFt = (route as unknown as { cruisingAltitude?: number }).cruisingAltitude
    ?? (data.aircraftProfile?.preferredCruiseAltitudeFt ?? 35000)

  const depPos  = msfsPosition(departure.lat, departure.lon, departure.elevation ?? 0)
  const arrPos  = msfsPosition(arrival.lat,   arrival.lon,   arrival.elevation  ?? 0)

  const waypointXml = route.waypoints.map((wp) => {
    const hasCoords = wp.lat != null && wp.lon != null
    const isAirport = wp.type === 'airport'
    const altFt     = isAirport ? (wp.id === departure.icao ? (departure.elevation ?? 0) : (arrival.elevation ?? 0)) : cruiseAltFt
    const pos       = hasCoords ? msfsPosition(wp.lat!, wp.lon!, altFt) : depPos

    return `        <ATCWaypoint id="${wp.id}">
            <ATCWaypointType>${msfsWaypointType(wp.type)}</ATCWaypointType>
            <WorldPosition>${pos}</WorldPosition>
            <SpeedMaxFP>-1</SpeedMaxFP>
            <ICAO>
                <ICAOIdent>${wp.id}</ICAOIdent>
            </ICAO>
        </ATCWaypoint>`
  }).join('\n')

  const alternateXml = alternate
    ? `
        <ATCWaypoint id="${alternate.icao}">
            <ATCWaypointType>Airport</ATCWaypointType>
            <WorldPosition>${msfsPosition(alternate.lat, alternate.lon, 0)}</WorldPosition>
            <SpeedMaxFP>-1</SpeedMaxFP>
            <ICAO>
                <ICAOIdent>${alternate.icao}</ICAOIdent>
            </ICAO>
        </ATCWaypoint>`
    : ''

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<SimBase.Document Type="AceXML" version="1,0">
    <Descr>AceXML Document</Descr>
    <FlightPlan.FlightPlan>
        <Title>${departure.icao} to ${arrival.icao}</Title>
        <FPType>IFR</FPType>
        <RouteType>HighAlt</RouteType>
        <CruisingAlt>${cruiseAltFt.toFixed(6)}</CruisingAlt>
        <DepartureID>${departure.icao}</DepartureID>
        <DepartureLLA>${depPos}</DepartureLLA>
        <DestinationID>${arrival.icao}</DestinationID>
        <DestinationLLA>${arrPos}</DestinationLLA>
        <Descr>${departure.icao}, ${arrival.icao}</Descr>
        <DepartureName>${(departure.name ?? departure.icao).toUpperCase()}</DepartureName>
        <DestinationName>${(arrival.name ?? arrival.icao).toUpperCase()}</DestinationName>
        <AppVersion>
            <AppVersionMajor>11</AppVersionMajor>
            <AppVersionBuild>282174</AppVersionBuild>
        </AppVersion>
${waypointXml}${alternateXml}
    </FlightPlan.FlightPlan>
</SimBase.Document>`

  triggerDownload(xml, `${departure.icao}_${arrival.icao}.pln`, 'application/xml')
}

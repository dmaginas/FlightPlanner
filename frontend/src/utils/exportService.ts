/**
 * exportService.ts — OFP PDF and MSFS .pln export for FlightPlanner.
 *
 * exportOFP   → Generates a formatted A4 Operational Flight Plan PDF (simulation only).
 * exportMsfsPln → Generates a Microsoft Flight Simulator 2020/2024 .pln XML file.
 */

import { calculateFuel } from './fuelCalculator.ts'
import { haversineNm } from './geoUtils'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ExportData {
  callsign?:   string
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

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function utcNow(): string {
  const d = new Date()
  return d.toUTCString().replace(' GMT', 'Z')
}

type FilePickerType = { description: string; accept: Record<string, string[]> }

async function saveAs(blob: Blob, filename: string, types: FilePickerType[]): Promise<void> {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker(o: { suggestedName: string; types: FilePickerType[] }): Promise<FileSystemFileHandle>
      }).showSaveFilePicker({ suggestedName: filename, types })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      // Other errors (e.g. security policy) — fall through to anchor fallback
    }
  }
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── OFP PDF layout constants ───────────────────────────────────────────────────

const PDF_W      = 210
const PDF_MARGIN = 14
const PDF_COL    = PDF_W - PDF_MARGIN * 2

// ── OFP PDF module-level rendering helpers ─────────────────────────────────────

// YRef threads the mutable y cursor through module-level rendering functions
// so they can be extracted from exportOFP without requiring a closure.
interface YRef { value: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsPDF = any

function pdfLine(doc: JsPDF, yRef: YRef, w = 0.2): void {
  doc.setDrawColor(80, 80, 100)
  doc.setLineWidth(w)
  doc.line(PDF_MARGIN, yRef.value, PDF_W - PDF_MARGIN, yRef.value)
  yRef.value += 3
}

function pdfSection(doc: JsPDF, yRef: YRef, title: string): void {
  yRef.value += 2
  doc.setFillColor(30, 30, 50)
  doc.rect(PDF_MARGIN, yRef.value, PDF_COL, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(180, 170, 255)
  doc.text(title.toUpperCase(), PDF_MARGIN + 3, yRef.value + 4)
  yRef.value += 9
  doc.setTextColor(40, 40, 60)
}

function pdfKv(doc: JsPDF, yRef: YRef, key: string, value: string, x = PDF_MARGIN, colW = PDF_COL / 2): void {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 140)
  doc.text(key, x, yRef.value)
  doc.setFont('courier', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(20, 20, 40)
  doc.text(value, x + colW * 0.45, yRef.value)
}

function pdfKvRow(doc: JsPDF, yRef: YRef, pairs: [string, string][]): void {
  const colW = PDF_COL / pairs.length
  pairs.forEach(([k, v], i) => pdfKv(doc, yRef, k, v, PDF_MARGIN + i * colW, colW))
  yRef.value += 7
}

function pdfCheckPage(doc: JsPDF, yRef: YRef, needed = 20): void {
  if (yRef.value + needed > 280) {
    doc.addPage()
    yRef.value = PDF_MARGIN
  }
}

// ── OFP PDF ────────────────────────────────────────────────────────────────────

export async function exportOFP(data: ExportData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { departure, arrival, alternate, route, aircraftProfile, selectedSID, selectedSTAR } = data

  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const yRef: YRef = { value: PDF_MARGIN }

  const distNm = route.routeDistanceNm ?? route.waypoints?.[route.waypoints.length - 1]?.distCum ?? 0

  const altDistNm = (arrival && alternate)
    ? haversineNm(arrival.lat, arrival.lon, alternate.lat, alternate.lon)
    : undefined

  const fuel = aircraftProfile && distNm
    ? calculateFuel({ distanceNm: distNm, aircraftProfile, windComponentKts: 0, altDistanceNm: altDistNm })
    : null

  // ── Header ─────────────────────────────────────────────────────────────────

  doc.setFillColor(15, 15, 35)
  doc.rect(0, 0, PDF_W, 22, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(139, 124, 255)
  doc.text('FlightPlanner', PDF_MARGIN, 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(160, 160, 180)
  doc.text('OPERATIONAL FLIGHT PLAN — SIMULATION USE ONLY', PDF_MARGIN, 16)

  doc.setFont('courier', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(`${departure.icao} → ${arrival.icao}`, PDF_W - PDF_MARGIN, 11, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(140, 140, 160)
  doc.text(utcNow(), PDF_W - PDF_MARGIN, 17, { align: 'right' })

  yRef.value = 28

  // ── Flight Details ─────────────────────────────────────────────────────────

  pdfSection(doc, yRef, 'Flight Details')
  pdfKvRow(doc, yRef, [['Departure', departure.icao + (departure.name ? ` — ${departure.name}` : '')], ['Destination', arrival.icao + (arrival.name ? ` — ${arrival.name}` : '')]])
  pdfKvRow(doc, yRef, [['Aircraft', aircraftProfile ? `${aircraftProfile.icaoCode} — ${aircraftProfile.displayName}` : (route.aircraft ?? '—')], ['Alternate', alternate ? alternate.icao + (alternate.name ? ` — ${alternate.name}` : '') : 'None']])
  pdfKvRow(doc, yRef, [['Cruise Alt', route.altitude ?? '—'], ['Route Type', 'IFR']])
  pdfKvRow(doc, yRef, [['SID', selectedSID?.name ?? 'None'], ['STAR', selectedSTAR?.name ?? 'None']])
  pdfKvRow(doc, yRef, [['Route Distance', `${Math.round(distNm)} NM`], ['Est. En-Route', route.etaMinutes ? formatTime(route.etaMinutes) + ' UTC' : '—']])

  pdfLine(doc, yRef)

  // ── Fuel Summary ───────────────────────────────────────────────────────────

  if (fuel) {
    pdfSection(doc, yRef, 'Fuel Summary')

    const fuelRows: [string, string][][] = [
      [['Taxi',    `${fuel.taxi.fuelTons.toFixed(2)} T`],  ['Climb',         `${fuel.climb.fuelTons.toFixed(2)} T`]],
      [['Cruise',  `${fuel.cruise.fuelTons.toFixed(2)} T`],['Descent',       `${fuel.descent.fuelTons.toFixed(2)} T`]],
      [['Trip Fuel',`${fuel.tripFuel.toFixed(2)} T`],      ['Contingency (5%)',`${fuel.contingency.toFixed(2)} T`]],
      [['Final Res (30 min)', `${fuel.finalReserve.toFixed(2)} T`], ['Alternate', `${fuel.alternate.toFixed(2)} T`]],
    ]
    fuelRows.forEach(row => pdfKvRow(doc, yRef, row))

    doc.setFillColor(0, 180, 130)
    doc.rect(PDF_MARGIN, yRef.value, PDF_COL, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL FUEL REQUIRED', PDF_MARGIN + 3, yRef.value + 5.5)
    doc.setFont('courier', 'bold')
    doc.setFontSize(11)
    doc.text(`${fuel.totalFuel.toFixed(1)} T`, PDF_W - PDF_MARGIN - 3, yRef.value + 5.5, { align: 'right' })
    yRef.value += 13
    pdfLine(doc, yRef)
  }

  // ── Waypoint Table ─────────────────────────────────────────────────────────

  pdfCheckPage(doc, yRef, 30)
  pdfSection(doc, yRef, 'Route — Waypoints')

  const cols = { ident: PDF_MARGIN, type: PDF_MARGIN + 22, airway: PDF_MARGIN + 38, lat: PDF_MARGIN + 60, lon: PDF_MARGIN + 88, dist: PDF_MARGIN + 116 }

  doc.setFillColor(45, 45, 70)
  doc.rect(PDF_MARGIN, yRef.value, PDF_COL, 5.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(180, 170, 255)
  ;[['IDENT', cols.ident], ['TYPE', cols.type], ['AIRWAY', cols.airway],
    ['LAT', cols.lat], ['LON', cols.lon], ['CUM DIST', cols.dist]].forEach(([t, x]) => {
    doc.text(t as string, x as number, yRef.value + 3.8)
  })
  yRef.value += 7

  doc.setFont('courier', 'normal')
  doc.setFontSize(7.5)

  route.waypoints.forEach((wp, i) => {
    pdfCheckPage(doc, yRef, 6)
    const isAirport = wp.type === 'airport'
    if (isAirport) {
      doc.setFillColor(25, 25, 45)
      doc.rect(PDF_MARGIN, yRef.value - 1, PDF_COL, 5.5, 'F')
    }
    doc.setTextColor(isAirport ? 200 : 80, isAirport ? 195 : 80, isAirport ? 255 : 100)
    doc.setFont('courier', isAirport ? 'bold' : 'normal')

    const lat = wp.lat != null ? `${Math.abs(wp.lat).toFixed(4)}${wp.lat >= 0 ? 'N' : 'S'}` : '—'
    const lon = wp.lon != null ? `${Math.abs(wp.lon).toFixed(4)}${wp.lon >= 0 ? 'E' : 'W'}` : '—'

    doc.text(wp.id ?? '—',              cols.ident,  yRef.value + 3)
    doc.text((wp.type ?? '—').toUpperCase().slice(0, 5), cols.type, yRef.value + 3)
    doc.text(wp.airway ?? (i === 0 ? 'DEP' : i === route.waypoints.length - 1 ? 'ARR' : 'DCT'), cols.airway, yRef.value + 3)
    doc.text(lat,                        cols.lat,    yRef.value + 3)
    doc.text(lon,                        cols.lon,    yRef.value + 3)
    doc.text(wp.distCum != null ? `${wp.distCum} NM` : '—', cols.dist, yRef.value + 3)
    yRef.value += 5
  })

  pdfLine(doc, yRef)

  // ── Disclaimer ─────────────────────────────────────────────────────────────

  pdfCheckPage(doc, yRef, 20)
  yRef.value += 4
  doc.setFillColor(60, 20, 20)
  doc.rect(PDF_MARGIN, yRef.value, PDF_COL, 14, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 120, 120)
  doc.text('FOR FLIGHT SIMULATION USE ONLY', PDF_MARGIN + 3, yRef.value + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(200, 160, 160)
  doc.text('This document is generated by FlightPlanner for Microsoft Flight Simulator / X-Plane use only.', PDF_MARGIN + 3, yRef.value + 10)
  doc.text('It must not be used for real-world aviation navigation or flight operations.', PDF_MARGIN + 3, yRef.value + 14.5)
  yRef.value += 19

  // ── Page numbers ───────────────────────────────────────────────────────────

  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 140)
    doc.text(`Page ${p} / ${totalPages}  —  ${departure.icao}→${arrival.icao}  —  FlightPlanner`, PDF_W / 2, 293, { align: 'center' })
  }

  await saveAs(
    doc.output('blob'),
    `OFP_${departure.icao}_${arrival.icao}.pdf`,
    [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
  )
}

// ── Google Earth KML ───────────────────────────────────────────────────────────

export async function exportKml(data: ExportData): Promise<void> {
  const { departure, arrival, alternate, route } = data

  const cruiseAltM = ((data.aircraftProfile?.preferredCruiseAltitudeFt ?? 35000) * 0.3048).toFixed(0)

  // KML coords: lon,lat,alt (metres)
  const wpCoords = route.waypoints
    .filter(wp => wp.lat != null && wp.lon != null)
    .map(wp => `${wp.lon!.toFixed(6)},${wp.lat!.toFixed(6)},${cruiseAltM}`)
    .join('\n              ')

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  function waypointStyle(type?: string): string {
    if (type === 'airport') return '#airport'
    if (type === 'vor')     return '#vor'
    if (type === 'ndb')     return '#ndb'
    return '#fix'
  }

  function waypointPlacemark(wp: typeof route.waypoints[number], label: string): string {
    if (wp.lat == null || wp.lon == null) return ''
    return `
    <Placemark>
      <name>${escape(label)}</name>
      <styleUrl>${waypointStyle(wp.type)}</styleUrl>
      <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${wp.lon.toFixed(6)},${wp.lat.toFixed(6)},${cruiseAltM}</coordinates>
      </Point>
    </Placemark>`
  }

  const waypointPlacemarks = route.waypoints
    .map(wp => waypointPlacemark(wp, wp.id))
    .filter(Boolean)
    .join('')

  const alternatePlacemark = alternate
    ? `
    <Placemark>
      <name>${escape(alternate.icao)}${alternate.name ? ' — ' + escape(alternate.name) : ''} (ALT)</name>
      <styleUrl>#airport</styleUrl>
      <Point>
        <altitudeMode>clampToGround</altitudeMode>
        <coordinates>${alternate.lon.toFixed(6)},${alternate.lat.toFixed(6)},0</coordinates>
      </Point>
    </Placemark>`
    : ''

  const totalNm = route.routeDistanceNm
    ?? route.waypoints[route.waypoints.length - 1]?.distCum
    ?? 0

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escape(departure.icao)} → ${escape(arrival.icao)}</name>
    <description>${escape(departure.name ?? departure.icao)} to ${escape(arrival.name ?? arrival.icao)}${totalNm ? ' — ' + Math.round(totalNm) + ' NM' : ''}</description>

    <!-- Styles -->
    <Style id="route">
      <LineStyle><color>ffff7800</color><width>3</width></LineStyle>
    </Style>
    <Style id="airport">
      <IconStyle><color>ff0000ff</color><scale>1.2</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/shapes/airports.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.9</scale></LabelStyle>
    </Style>
    <Style id="vor">
      <IconStyle><color>ff00aaff</color><scale>0.9</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.75</scale></LabelStyle>
    </Style>
    <Style id="ndb">
      <IconStyle><color>ff00ddaa</color><scale>0.8</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.75</scale></LabelStyle>
    </Style>
    <Style id="fix">
      <IconStyle><color>ffffffff</color><scale>0.6</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.65</scale></LabelStyle>
    </Style>

    <!-- Route line -->
    <Placemark>
      <name>${escape(departure.icao)} → ${escape(arrival.icao)}</name>
      <styleUrl>#route</styleUrl>
      <LineString>
        <altitudeMode>absolute</altitudeMode>
        <tessellate>1</tessellate>
        <coordinates>
              ${wpCoords}
        </coordinates>
      </LineString>
    </Placemark>

    <!-- Waypoints -->${waypointPlacemarks}${alternatePlacemark}
  </Document>
</kml>`

  await saveAs(
    new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' }),
    `${departure.icao}_${arrival.icao}.kml`,
    [{ description: 'Google Earth KML', accept: { 'application/vnd.google-earth.kml+xml': ['.kml'] } }],
  )
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

export async function exportMsfsPln(data: ExportData): Promise<void> {
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

  await saveAs(
    new Blob([xml], { type: 'application/xml' }),
    `${departure.icao}_${arrival.icao}.pln`,
    [{ description: 'MSFS Flight Plan', accept: { 'application/xml': ['.pln'] } }],
  )
}

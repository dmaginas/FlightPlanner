import { useEffect, useState } from 'react'
import { fetchMetarByIcao, MetarServiceError, normalizeIcaoCode } from '../services/metarService.ts'
import { fetchTafByIcao, TafServiceError } from '../services/tafService.ts'
import { fetchSigmets, type SigmetItem } from '../services/sigmetService.ts'

// ── Shared sub-components ─────────────────────────────────────────────────────

function StatusText({ text }) {
  return <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>{text}</div>
}

function EmptySlot({ label }) {
  return (
    <div style={{
      border: '1px dashed var(--line)', borderRadius: 'var(--r)',
      padding: '20px 16px', textAlign: 'center',
      color: 'var(--dim)', fontSize: 12,
    }}>{label}</div>
  )
}

function DataBlock({ text }: { text: string }) {
  return (
    <div style={{
      marginTop: 8, padding: '8px 10px', borderRadius: 'var(--r-sm)',
      background: 'rgba(0,0,0,.2)', border: '1px solid var(--line-2)',
      fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--dim)',
      lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      {text}
    </div>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{
      marginTop: 14, marginBottom: 2,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
      color: 'var(--muted)', textTransform: 'uppercase',
    }}>
      {text}
    </div>
  )
}

// ── AirportWeather ────────────────────────────────────────────────────────────

function AirportWeather({ airport, role }) {
  if (!airport) return null

  const [metar, setMetar] = useState<{ status: string; text: string; message: string }>(
    { status: 'idle', text: '', message: '' }
  )
  const [taf, setTaf] = useState<{ status: string; text: string; message: string }>(
    { status: 'idle', text: '', message: '' }
  )
  useEffect(() => {
    const controller = new AbortController()
    const normalizedIcao = normalizeIcaoCode(airport?.icao)

    if (!airport || !normalizedIcao) {
      const msg = !airport
        ? 'Select an airport to load weather data.'
        : 'No ICAO code available for this airport.'
      setMetar({ status: 'empty', text: '', message: msg })
      setTaf(  { status: 'empty', text: '', message: msg })
      return
    }

    setMetar({ status: 'loading', text: '', message: '' })
    fetchMetarByIcao(normalizedIcao, controller.signal)
      .then((record) => {
        if (!record?.rawText) {
          setMetar({ status: 'empty', text: '', message: 'No METAR available.' })
        } else {
          setMetar({ status: 'ready', text: record.rawText, message: '' })
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
        if (err instanceof MetarServiceError && err.kind === 'empty_response') {
          setMetar({ status: 'empty', text: '', message: err.message })
        } else {
          setMetar({ status: 'error', text: '', message: 'METAR could not be loaded.' })
        }
      })

    setTaf({ status: 'loading', text: '', message: '' })
    fetchTafByIcao(normalizedIcao, controller.signal)
      .then((record) => {
        if (!record?.rawText) {
          setTaf({ status: 'empty', text: '', message: 'No TAF available.' })
        } else {
          setTaf({ status: 'ready', text: record.rawText, message: '' })
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
        if (err instanceof TafServiceError && err.kind === 'empty_response') {
          setTaf({ status: 'empty', text: '', message: err.message })
        } else {
          setTaf({ status: 'error', text: '', message: 'TAF could not be loaded.' })
        }
      })

    return () => controller.abort()
  }, [airport?.icao])

  return (
    <div style={{
      background: 'var(--glass-2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r)', padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>
            {airport.icao}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {role === 'dep' ? '↑ Departure' : '↓ Arrival'}
          </div>
        </div>
      </div>

      <SectionLabel text="METAR" />
      {metar.status === 'loading' && <StatusText text="Loading METAR…" />}
      {(metar.status === 'empty' || metar.status === 'error') && <StatusText text={metar.message} />}
      {metar.status === 'ready' && <DataBlock text={metar.text} />}

      <SectionLabel text="TAF" />
      {taf.status === 'loading' && <StatusText text="Loading TAF…" />}
      {(taf.status === 'empty' || taf.status === 'error') && <StatusText text={taf.message} />}
      {taf.status === 'ready' && <DataBlock text={taf.text} />}
    </div>
  )
}

// ── Hazard colour coding ───────────────────────────────────────────────────────

const HAZARD_COLORS: Record<string, string> = {
  TS:   'var(--red)',
  TURB: 'var(--amber)',
  ICE:  '#38bdf8',
  IFR:  'var(--muted)',
  LLWS: '#a78bfa',
}

function hazardColor(hazard: string): string {
  return HAZARD_COLORS[hazard.toUpperCase()] ?? 'var(--muted)'
}

function fmtAlt(low?: number, high?: number): string {
  if (low == null && high == null) return ''
  if (low != null && high != null) return `FL${Math.round(low / 100)}–FL${Math.round(high / 100)}`
  if (high != null) return `up to FL${Math.round(high / 100)}`
  return `above FL${Math.round(low! / 100)}`
}

function SigmetCard({ item }: { item: SigmetItem }) {
  const color   = hazardColor(item.hazard)
  const altStr  = fmtAlt(item.altLowFt, item.altHighFt)
  const validTo = item.validTo ? new Date(item.validTo).toUTCString().replace(' GMT', 'Z') : null

  return (
    <div style={{
      padding: '9px 10px', borderRadius: 'var(--r-sm)',
      border: '1px solid var(--line-2)',
      background: 'rgba(0,0,0,.15)',
      marginBottom: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
          color, letterSpacing: '0.06em',
        }}>{item.type}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color }}>{item.hazard}</span>
        {item.severity && (
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{item.severity}</span>
        )}
        {altStr && (
          <span style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{altStr}</span>
        )}
      </div>
      {item.rawText && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--dim)',
          lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {item.rawText.length > 300 ? item.rawText.slice(0, 300) + '…' : item.rawText}
        </div>
      )}
      {validTo && (
        <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 4 }}>Valid until {validTo}</div>
      )}
    </div>
  )
}

// ── SigmetSection ─────────────────────────────────────────────────────────────

function SigmetSection({ departure, arrival }) {
  const [items, setItems]   = useState<SigmetItem[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    if (!departure || !arrival) { setItems([]); setStatus('idle'); return }

    const ctrl = new AbortController()
    setStatus('loading')

    fetchSigmets(departure.lat, departure.lon, arrival.lat, arrival.lon, ctrl.signal)
      .then(result => { setItems(result.items); setStatus('ready') })
      .catch(err => {
        if (ctrl.signal.aborted || err?.name === 'AbortError') return
        console.warn('SigMet fetch failed:', err)
        setStatus('error')
      })

    return () => ctrl.abort()
  }, [departure?.icao, arrival?.icao])

  if (!departure || !arrival) return null

  return (
    <div style={{
      background: 'var(--glass-2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r)', padding: '14px 16px',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
        SIGMETs / AIRMETs
      </div>
      {status === 'loading' && <StatusText text="Loading SIGMETs…" />}
      {status === 'error'   && <StatusText text="SIGMETs could not be loaded." />}
      {status === 'ready' && (items ?? []).length === 0 && (
        <StatusText text="No active SIGMETs or AIRMETs along route." />
      )}
      {status === 'ready' && (items ?? []).map((item, i) => <SigmetCard key={i} item={item} />)}
    </div>
  )
}

// ── WeatherPanel ──────────────────────────────────────────────────────────────

export default function WeatherPanel({ departure, arrival }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.02em' }}>
        WEATHER BRIEFING
      </div>
      {departure ? <AirportWeather airport={departure} role="dep" /> : <EmptySlot label="Select departure airport" />}
      {arrival   ? <AirportWeather airport={arrival}   role="arr" /> : <EmptySlot label="Select arrival airport" />}
      <SigmetSection departure={departure} arrival={arrival} />
    </div>
  )
}

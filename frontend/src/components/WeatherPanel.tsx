import { useEffect, useState } from 'react'
import { fetchMetarByIcao, MetarServiceError, normalizeIcaoCode } from '../services/metarService.ts'
import { fetchTafByIcao, TafServiceError } from '../services/tafService.ts'
import { fetchNotamsByIcao, NotamServiceError, type NotamItem } from '../services/notamService.ts'

// ── Sub-components ────────────────────────────────────────────────────────────

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

function NotamList({ notams }: { notams: NotamItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
      {notams.map((n) => (
        <div key={n.id} style={{
          padding: '7px 10px', borderRadius: 'var(--r-sm)',
          background: 'rgba(0,0,0,.2)', border: '1px solid var(--line-2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--text)' }}>
              {n.number}
            </span>
            {n.classification && (
              <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.05em' }}>
                {n.classification}
              </span>
            )}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--dim)',
            lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {n.text}
          </div>
          <div style={{ marginTop: 4, fontSize: 9.5, color: 'var(--muted)' }}>
            {n.effectiveStart && `From ${n.effectiveStart}`}
            {n.effectiveEnd   && ` · Until ${n.effectiveEnd}`}
          </div>
        </div>
      ))}
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
  const [notam, setNotam] = useState<{ status: string; items: NotamItem[]; total: number; message: string }>(
    { status: 'idle', items: [], total: 0, message: '' }
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
      setNotam({ status: 'empty', items: [], total: 0, message: msg })
      return
    }

    // ── METAR ──────────────────────────────────────────────────────────────
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

    // ── TAF ────────────────────────────────────────────────────────────────
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

    // ── NOTAMs ────────────────────────────────────────────────────────────
    setNotam({ status: 'loading', items: [], total: 0, message: '' })
    fetchNotamsByIcao(normalizedIcao, controller.signal)
      .then((record) => {
        if (!record || record.notams.length === 0) {
          setNotam({ status: 'empty', items: [], total: 0, message: 'No active NOTAMs.' })
        } else {
          setNotam({ status: 'ready', items: record.notams, total: record.total, message: '' })
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
        if (err instanceof NotamServiceError && err.kind === 'config_error') {
          setNotam({ status: 'error', items: [], total: 0, message: 'NOTAM API key not configured.' })
        } else {
          setNotam({ status: 'error', items: [], total: 0, message: 'NOTAMs could not be loaded.' })
        }
      })

    return () => controller.abort()
  }, [airport?.icao])

  return (
    <div style={{
      background: 'var(--glass-2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r)', padding: '14px 16px',
    }}>
      {/* Header */}
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

      {/* METAR */}
      <SectionLabel text="METAR" />
      {metar.status === 'loading' && <StatusText text="Loading METAR…" />}
      {(metar.status === 'empty' || metar.status === 'error') && <StatusText text={metar.message} />}
      {metar.status === 'ready' && <DataBlock text={metar.text} />}

      {/* TAF */}
      <SectionLabel text="TAF" />
      {taf.status === 'loading' && <StatusText text="Loading TAF…" />}
      {(taf.status === 'empty' || taf.status === 'error') && <StatusText text={taf.message} />}
      {taf.status === 'ready' && <DataBlock text={taf.text} />}

      {/* NOTAMs */}
      <SectionLabel text={notam.status === 'ready' ? `NOTAMs (${notam.total})` : 'NOTAMs'} />
      {notam.status === 'loading' && <StatusText text="Loading NOTAMs…" />}
      {(notam.status === 'empty' || notam.status === 'error') && <StatusText text={notam.message} />}
      {notam.status === 'ready' && <NotamList notams={notam.items} />}
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
    </div>
  )
}

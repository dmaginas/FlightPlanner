import { useEffect, useState } from 'react'
import { fetchMetarByIcao, normalizeIcaoCode } from '../services/metarService.ts'

function AirportWeather({ airport, role }) {
  if (!airport) return null
  const [state, setState] = useState({ status: 'idle', metar: null, message: '' })

  useEffect(() => {
    const controller = new AbortController()
    const normalizedIcao = normalizeIcaoCode(airport?.icao)

    async function loadMetar() {
      if (!airport) {
        setState({ status: 'empty', metar: null, message: 'Select an airport to load METAR data.' })
        return
      }

      if (!normalizedIcao) {
        setState({ status: 'empty', metar: null, message: 'No ICAO airport code is available for METAR lookup.' })
        return
      }

      setState({ status: 'loading', metar: null, message: '' })
      try {
        const metar = await fetchMetarByIcao(normalizedIcao, controller.signal)
        if (!metar || !metar.rawText) {
          setState({ status: 'empty', metar: null, message: 'No METAR is currently available for this airport.' })
          return
        }
        setState({ status: 'ready', metar, message: '' })
      } catch (error) {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return
        setState({ status: 'error', metar: null, message: 'METAR data could not be loaded right now.' })
      }
    }

    loadMetar()
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

      {state.status === 'loading' && <StatusText text='Loading METAR…' />}
      {state.status === 'empty' && <StatusText text={state.message} />}
      {state.status === 'error' && <StatusText text={state.message} />}

      {/* METAR */}
      <div style={{
        marginTop: 12, padding: '8px 10px', borderRadius: 'var(--r-sm)',
        background: 'rgba(0,0,0,.2)', border: '1px solid var(--line-2)',
        fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--dim)',
        lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {state.status === 'ready' ? state.metar.rawText : '—'}
      </div>
    </div>
  )
}

export default function WeatherPanel({ departure, arrival }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.02em' }}>
        WEATHER BRIEFING
      </div>
      <div style={{ fontSize: 11, color: 'var(--amber)', lineHeight: 1.5 }}>
        METAR data is shown for flight simulation only and must not be used for real-world aviation decisions.
      </div>

      {departure ? <AirportWeather airport={departure} role="dep" /> : <EmptySlot label="Select departure airport" />}
      {arrival   ? <AirportWeather airport={arrival}   role="arr" /> : <EmptySlot label="Select arrival airport" />}
    </div>
  )
}

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

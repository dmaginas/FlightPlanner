import { useEffect, useState } from 'react'
import { fetchMetarByIcao } from '../services/metarService.ts'

function CatBadge({ cat }) {
  const colors = {
    VFR:  { bg: 'rgba(0,229,168,.15)', color: 'var(--mint)',  border: 'rgba(0,229,168,.3)' },
    MVFR: { bg: 'rgba(255,196,87,.15)', color: 'var(--amber)', border: 'rgba(255,196,87,.3)' },
    IFR:  { bg: 'rgba(255,92,114,.15)', color: 'var(--red)',   border: 'rgba(255,92,114,.3)' },
    LIFR: { bg: 'rgba(255,92,114,.25)', color: 'var(--red)',   border: 'rgba(255,92,114,.5)' },
  }
  const c = colors[cat] ?? colors.VFR
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      letterSpacing: '0.08em', fontFamily: 'var(--font-mono)',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>{cat}</span>
  )
}

function AirportWeather({ airport, role }) {
  if (!airport) return null
  const [state, setState] = useState({ status: 'idle', metar: null, message: '' })

  useEffect(() => {
    let cancelled = false

    async function loadMetar() {
      if (!airport?.icao) {
        setState({ status: 'empty', metar: null, message: 'No ICAO airport code is available for METAR lookup.' })
        return
      }

      setState({ status: 'loading', metar: null, message: '' })
      try {
        const metar = await fetchMetarByIcao(airport.icao)
        if (cancelled) return
        if (!metar || !metar.rawText) {
          setState({ status: 'empty', metar: null, message: 'No METAR is currently available for this airport.' })
          return
        }
        setState({ status: 'ready', metar, message: '' })
      } catch {
        if (cancelled) return
        setState({ status: 'error', metar: null, message: 'METAR data could not be loaded right now.' })
      }
    }

    loadMetar()
    return () => { cancelled = true }
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
        <CatBadge cat={state.metar?.flightCategory ?? 'VFR'} />
      </div>

      <DataCell
        label="Report time"
        value={state.metar?.reportTime ? new Date(state.metar.reportTime).toLocaleString() : '—'}
      />

      {state.status === 'loading' && <StatusText text='Loading METAR…' />}
      {state.status === 'empty' && <StatusText text={state.message} />}
      {state.status === 'error' && <StatusText text={state.message} />}

      {/* METAR */}
      <div style={{
        marginTop: 12, padding: '8px 10px', borderRadius: 'var(--r-sm)',
        background: 'rgba(0,0,0,.2)', border: '1px solid var(--line-2)',
        fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--dim)',
        lineHeight: 1.5, wordBreak: 'break-all',
      }}>
        {state.status === 'ready' ? state.metar.rawText : '—'}
      </div>
    </div>
  )
}

function DataCell({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</div>
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

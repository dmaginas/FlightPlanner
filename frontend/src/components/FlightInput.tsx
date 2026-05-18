import { useState, useRef, useEffect } from 'react'
import { searchAirports } from '../data/airports.ts'
import { filterAircraftProfiles, getAircraftDisplayLabel } from '../data/aircraftPerformance.ts'

function AirportSearch({ label, role, value, onChange }) {
  const [query, setQuery]       = useState(value ? `${value.icao} — ${value.name}` : '')
  const [results, setResults]   = useState([])
  const [open, setOpen]         = useState(false)
  const [focused, setFocused]   = useState(false)
  const inputRef = useRef()
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
    setQuery(value ? `${value.icao} — ${value.name}` : '')
  }, [value])

  async function handleInput(e) {
    const q = e.target.value
    setQuery(q)

    try {
      const found = await searchAirports(q)
      setResults(found)
      setOpen(found.length > 0)
    } catch {
      setResults([])
      setOpen(false)
    }
  }

  function select(apt) {
    onChange(apt)
    setQuery(`${apt.icao} — ${apt.name}`)
    setOpen(false)
    inputRef.current?.blur()
  }

  function handleFocus() {
    setFocused(true)
    if (valueRef.current) setQuery('')
  }

  function handleBlur() {
    setFocused(false)
    setTimeout(() => {
      const currentValue = valueRef.current
      setOpen(false)
      if (!currentValue) setQuery('')
      else setQuery(`${currentValue.icao} — ${currentValue.name}`)
    }, 160)
  }

  const catColor = { VFR: 'var(--mint)', MVFR: 'var(--amber)', IFR: 'var(--red)' }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--violet)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 16, height: 16, borderRadius: 5, background: 'var(--violet-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>
          {role === 'dep' ? '↑' : '↓'}
        </span>
        {label}
      </div>

      <div style={{
        borderRadius: 'var(--r)', border: `1px solid ${focused ? 'rgba(139,124,255,.5)' : 'var(--line)'}`,
        background: focused ? 'rgba(139,124,255,.06)' : 'var(--glass-2)',
        transition: 'all .2s', overflow: 'hidden',
      }}>
        <input
          ref={inputRef}
          value={query}
          onChange={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={role === 'dep' ? 'ICAO or city' : 'ICAO or city'}
          style={{
            width: '100%', padding: '12px 14px',
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500,
            background: 'transparent', color: 'var(--text)',
            letterSpacing: '0.03em',
          }}
        />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-2)', border: '1px solid var(--line)',
          borderRadius: 'var(--r)', overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,.55)',
        }}>
          {results.map(apt => (
            <button
              key={apt.icao}
              onMouseDown={() => select(apt)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', textAlign: 'left',
                background: 'transparent', cursor: 'pointer',
                borderBottom: '1px solid var(--line-2)', transition: 'background .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--glass)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>
                  {apt.icao} <span style={{ color: 'var(--dim)', fontWeight: 400 }}>/ {apt.iata}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{apt.name}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)', textAlign: 'right' }}>
                <div>{apt.city}</div>
                <div>{apt.country}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AircraftCombobox({ selectedAircraftProfile, onAircraftChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const options = filterAircraftProfiles(query)

  function select(profile) {
    onAircraftChange(profile.icaoCode)
    setQuery('')
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--violet)', marginBottom: 8 }}>Aircraft Type</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{getAircraftDisplayLabel(selectedAircraftProfile)}</div>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setFocusedIndex(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || !options.length) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex((i) => Math.min(i + 1, options.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex((i) => Math.max(i - 1, 0)) }
          if (e.key === 'Enter') { e.preventDefault(); select(options[focusedIndex]) }
        }}
        placeholder="Search ICAO, manufacturer, aircraft"
        style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--r)', background: 'var(--glass-2)', border: '1px solid var(--line)', color: 'var(--text)' }}
      />
      {open && (
        <div style={{ position: 'absolute', zIndex: 220, left: 0, right: 0, top: 'calc(100% + 6px)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', maxHeight: 220, overflowY: 'auto' }}>
          {options.map((profile, i) => (
            <button key={profile.icaoCode} onMouseDown={() => select(profile)} style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: i===focusedIndex ? 'var(--glass)' : 'transparent', borderBottom: '1px solid var(--line-2)', color: 'var(--text)', cursor: 'pointer' }}>
              {getAircraftDisplayLabel(profile)}
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{profile.manufacturer}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FlightInput({ departure, arrival, routeState, selectedSID, selectedSTAR, selectedAircraftProfile, onAircraftChange, onDepartureChange, onArrivalChange, onCalculate, onNavigate }) {
  const dist = departure && arrival
    ? Math.round(Math.sqrt(((departure.lat - arrival.lat) * 111) ** 2 + ((departure.lon - arrival.lon) * 79) ** 2) * 0.54) // rough NM
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Airport inputs */}
      <div style={{
        background: 'var(--glass-2)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)', padding: '20px',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 16, letterSpacing: '0.02em' }}>
          ROUTE SETUP
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AirportSearch label="Departure" role="dep" value={departure} onChange={onDepartureChange} />

          {/* Swap / connector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '1px solid var(--line)', background: 'var(--glass)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: 'var(--muted)', flexShrink: 0,
            }}>⇅</div>
            <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
          </div>

          <AirportSearch label="Arrival" role="arr" value={arrival} onChange={onArrivalChange} />
          <AircraftCombobox selectedAircraftProfile={selectedAircraftProfile} onAircraftChange={onAircraftChange} />
        </div>

        {/* Distance */}
        {dist && (
          <div style={{
            marginTop: 14, padding: '8px 12px', borderRadius: 'var(--r-sm)',
            background: 'var(--violet-dim)', border: '1px solid var(--violet-soft)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Est. Distance</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--violet)' }}>~{dist} NM</span>
          </div>
        )}

        {/* Calculate button */}
        <button
          onClick={onCalculate}
          disabled={!departure || !arrival || routeState === 'loading'}
          style={{
            marginTop: 14, width: '100%', padding: '12px',
            borderRadius: 'var(--r)', fontFamily: 'var(--font-display)',
            fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
            background: routeState === 'loading'
              ? 'rgba(139,124,255,.2)'
              : 'linear-gradient(135deg, rgba(139,124,255,.9), rgba(0,229,168,.7))',
            color: '#fff', cursor: routeState === 'loading' ? 'not-allowed' : 'pointer',
            border: 'none', transition: 'opacity .2s',
            opacity: (!departure || !arrival) ? .45 : 1,
          }}
        >
          {routeState === 'loading' ? 'Calculating Route…' : 'Calculate Route'}
        </button>
      </div>

      {/* Procedure selection */}
      {routeState === 'ready' && (
        <div style={{
          background: 'var(--glass-2)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)', padding: '20px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, letterSpacing: '0.02em' }}>
            PROCEDURES
          </div>

          <ProcButton
            label="SID"
            sub={selectedSID ? selectedSID.name : 'Select departure procedure'}
            active={!!selectedSID}
            onClick={() => onNavigate('sid')}
          />
          <ProcButton
            label="STAR"
            sub={selectedSTAR ? selectedSTAR.name : 'Select arrival procedure'}
            active={!!selectedSTAR}
            onClick={() => onNavigate('star')}
          />
        </div>
      )}
    </div>
  )
}

function ProcButton({ label, sub, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderRadius: 'var(--r)',
        background: active ? 'var(--mint-soft)' : 'var(--glass)',
        border: `1px solid ${active ? 'rgba(0,229,168,.3)' : 'var(--line)'}`,
        cursor: 'pointer', transition: 'all .15s', textAlign: 'left', width: '100%',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--glass-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'var(--glass)' }}
    >
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: active ? 'var(--mint)' : 'var(--violet)', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 12, color: active ? 'var(--text)' : 'var(--muted)', marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ color: active ? 'var(--mint)' : 'var(--dim)', fontSize: 16 }}>{active ? '✓' : '›'}</span>
    </button>
  )
}

import { useState, useRef, useEffect } from 'react'
import { searchAirports } from '../data/airports.ts'
import { filterAircraftProfiles, getAircraftDisplayLabel } from '../data/aircraftPerformance.ts'
import { fetchProcedures, toDisplayProcedures, type DisplayProcedure } from '../services/procedureService.ts'

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

function AlternateSearch({ value, onChange }) {
  const [query, setQuery]     = useState(value ? `${value.icao} — ${value.name}` : '')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)
  const [focused, setFocused] = useState(false)
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
      setOpen(false)
      if (!valueRef.current) setQuery('')
      else setQuery(`${valueRef.current.icao} — ${valueRef.current.name}`)
    }, 160)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--amber)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 16, height: 16, borderRadius: 5, background: 'rgba(255,180,80,.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>
          ◈
        </span>
        Alternate Airport
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--dim)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
          optional
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          flex: 1, borderRadius: 'var(--r)', overflow: 'hidden',
          border: `1px solid ${focused ? 'rgba(255,180,80,.5)' : value ? 'rgba(255,180,80,.3)' : 'var(--line)'}`,
          background: focused ? 'rgba(255,180,80,.06)' : 'var(--glass-2)',
          transition: 'all .2s',
        }}>
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="ICAO or city"
            style={{
              width: '100%', padding: '12px 14px',
              fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500,
              background: 'transparent', color: 'var(--text)', letterSpacing: '0.03em',
            }}
          />
        </div>
        {value && (
          <button
            onMouseDown={() => { onChange(null); setQuery('') }}
            style={{
              width: 28, height: 28, borderRadius: 'var(--r-sm)', flexShrink: 0,
              border: '1px solid var(--line)', background: 'var(--glass)',
              color: 'var(--muted)', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        )}
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
                padding: '10px 14px', textAlign: 'left', background: 'transparent', cursor: 'pointer',
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

function CruiseAltitudeInput({ value, onChange, aircraftDefault }: {
  value: number | null
  onChange: (alt: number | null) => void
  aircraftDefault?: number
}) {
  const toText = (ft: number | null) => ft !== null ? `FL${Math.round(ft / 100)}` : ''
  const [text, setText] = useState(toText(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => { setText(toText(value)) }, [value])

  function parseAlt(raw: string): number | null {
    const s = raw.trim().toUpperCase().replace(/\s/g, '')
    if (!s) return null
    const fl = s.match(/^FL(\d{1,3})$/)
    if (fl) return parseInt(fl[1]) * 100
    const n = parseInt(s)
    if (!isNaN(n) && n >= 10 && n <= 999) return n * 100
    if (!isNaN(n) && n >= 1000 && n <= 99000) return n
    return null
  }

  function handleBlur() {
    setFocused(false)
    const alt = parseAlt(text)
    if (alt !== null) {
      setText(`FL${Math.round(alt / 100)}`)
      onChange(alt)
    } else {
      setText('')
      onChange(null)
    }
  }

  const defaultLabel = aircraftDefault ? `FL${Math.round(aircraftDefault / 100)}` : 'FL350'

  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--violet)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 16, height: 16, borderRadius: 5, background: 'var(--violet-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>
          ✈
        </span>
        Cruise Altitude
      </div>
      <div style={{
        borderRadius: 'var(--r)', border: `1px solid ${focused ? 'rgba(139,124,255,.5)' : value !== null ? 'rgba(139,124,255,.3)' : 'var(--line)'}`,
        background: focused ? 'rgba(139,124,255,.06)' : 'var(--glass-2)',
        transition: 'all .2s', display: 'flex', alignItems: 'center', overflow: 'hidden',
      }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          placeholder={`${defaultLabel} (default)`}
          style={{
            flex: 1, padding: '12px 14px',
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500,
            background: 'transparent', color: 'var(--text)', letterSpacing: '0.03em',
          }}
        />
        {value !== null && (
          <button
            onMouseDown={e => { e.preventDefault(); onChange(null); setText('') }}
            title="Reset to aircraft default"
            style={{
              padding: '0 12px', height: '100%', flexShrink: 0,
              background: 'transparent', border: 'none', borderLeft: '1px solid var(--line)',
              color: 'var(--dim)', fontSize: 14, cursor: 'pointer',
            }}
          >×</button>
        )}
      </div>
      {value !== null && (
        <div style={{ marginTop: 5, fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          {value.toLocaleString()} ft — override active
        </div>
      )}
    </div>
  )
}

function ProcSelector({ label, procs, selected, onChange }: {
  label:    string
  procs:    DisplayProcedure[]
  selected: DisplayProcedure | null
  onChange: (proc: DisplayProcedure | null) => void
}) {
  const [open, setOpen] = useState(false)

  if (!procs || procs.length === 0) return null

  const selectedSummary = selected
    ? selected.runway ? `${selected.name}  RWY ${selected.runway}` : selected.name
    : `Select ${label === 'SID' ? 'departure' : 'arrival'} procedure`

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 'var(--r)',
          background: selected ? 'rgba(0,229,168,.06)' : 'var(--glass)',
          border: `1px solid ${selected ? 'rgba(0,229,168,.3)' : 'var(--line)'}`,
          cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: selected ? 'var(--mint)' : 'var(--violet)', flexShrink: 0 }}>{label}</span>
        <span style={{ flex: 1, fontSize: 11, color: selected ? 'var(--text)' : 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedSummary}
        </span>
        {selected && <span style={{ fontSize: 10, color: 'var(--mint)', flexShrink: 0 }}>✓</span>}
        <span style={{ fontSize: 9, color: 'var(--dim)', flexShrink: 0 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 2, borderRadius: 'var(--r)', border: '1px solid var(--line)',
          background: 'var(--bg-2)', overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
        }}>
          <button
            onClick={() => { onChange(null); setOpen(false) }}
            style={{
              width: '100%', padding: '7px 12px', textAlign: 'left', cursor: 'pointer',
              background: !selected ? 'rgba(139,124,255,.06)' : 'transparent',
              borderBottom: '1px solid var(--line-2)',
              fontSize: 11, color: !selected ? 'var(--text)' : 'var(--dim)',
            }}
          >
            None — direct from airport
          </button>
          {procs.map(proc => (
            <button
              key={proc.id}
              onClick={() => { onChange(proc); setOpen(false) }}
              style={{
                width: '100%', padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                background: selected?.id === proc.id ? 'rgba(0,229,168,.06)' : 'transparent',
                borderBottom: '1px solid var(--line-2)', transition: 'background .1s',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
              onMouseEnter={e => { if (selected?.id !== proc.id) e.currentTarget.style.background = 'var(--glass)' }}
              onMouseLeave={e => { if (selected?.id !== proc.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: selected?.id === proc.id ? 'var(--mint)' : 'var(--text)' }}>{proc.name}</span>
                {proc.runway && <span style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 6 }}>RWY {proc.runway}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FlightInput({ departure, arrival, alternate, routeState, selectedSID, selectedSTAR, selectedAircraftProfile, cruisingAltitude, onAircraftChange, onAltitudeChange, onDepartureChange, onArrivalChange, onAlternateChange, onCalculate, onSIDChange, onSTARChange }) {
  const roughNm = (a, b) => a && b
    ? Math.round(Math.sqrt(((a.lat - b.lat) * 111) ** 2 + ((a.lon - b.lon) * 79) ** 2) * 0.54)
    : null

  const dist    = roughNm(departure, arrival)
  const altDist = roughNm(arrival, alternate)

  const [sids,  setSids]  = useState<DisplayProcedure[]>([])
  const [stars, setStars] = useState<DisplayProcedure[]>([])

  useEffect(() => {
    if (!departure?.icao) { setSids([]); return }
    const ctrl = new AbortController()
    fetchProcedures(departure.icao, ctrl.signal)
      .then(data => setSids(toDisplayProcedures(data.sids)))
      .catch(() => setSids([]))
    return () => ctrl.abort()
  }, [departure?.icao])

  useEffect(() => {
    if (!arrival?.icao) { setStars([]); return }
    const ctrl = new AbortController()
    fetchProcedures(arrival.icao, ctrl.signal)
      .then(data => setStars(toDisplayProcedures(data.stars)))
      .catch(() => setStars([]))
    return () => ctrl.abort()
  }, [arrival?.icao])

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
          <ProcSelector label="SID" procs={sids} selected={selectedSID} onChange={onSIDChange} />

          {/* Connector */}
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
          <ProcSelector label="STAR" procs={stars} selected={selectedSTAR} onChange={onSTARChange} />
          <AircraftCombobox selectedAircraftProfile={selectedAircraftProfile} onAircraftChange={onAircraftChange} />
          <CruiseAltitudeInput
            value={cruisingAltitude}
            onChange={onAltitudeChange}
            aircraftDefault={selectedAircraftProfile?.preferredCruiseAltitudeFt}
          />
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
      </div>

      {/* Alternate airport */}
      <div style={{
        background: 'var(--glass-2)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)', padding: '20px',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, letterSpacing: '0.02em' }}>
          ALTERNATE
        </div>
        <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 12 }}>
          Optional — required by ICAO regulations for IFR flights
        </div>

        <AlternateSearch value={alternate} onChange={onAlternateChange} />

        {alternate && altDist && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 'var(--r-sm)',
            background: 'rgba(255,180,80,.08)', border: '1px solid rgba(255,180,80,.25)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>DEST → ALTN</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--amber)' }}>~{altDist} NM</span>
          </div>
        )}
      </div>

      {/* Calculate button */}
      <div style={{
        background: 'var(--glass-2)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)', padding: '20px',
      }}>
        <button
          onClick={onCalculate}
          disabled={!departure || !arrival || routeState === 'loading'}
          style={{
            width: '100%', padding: '12px',
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

    </div>
  )
}

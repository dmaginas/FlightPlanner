import { useState, useEffect, useRef } from 'react'
import { calculateFuel, type FuelBreakdown } from '../utils/fuelCalculator.ts'
import { fetchWinds } from '../services/windsService.ts'

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
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function utcNow(): string {
  const d = new Date()
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

function WindSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const label = value === 0 ? 'Calm' : value > 0 ? `${value} kt HW` : `${Math.abs(value)} kt TW`
  const color  = value > 20 ? 'var(--red)' : value < -20 ? 'var(--mint)' : value !== 0 ? 'var(--amber)' : 'var(--muted)'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Avg Wind Component
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color }}>{label}</span>
      </div>
      <input
        type="range" min={-120} max={120} step={5} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--violet)', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 9, color: 'var(--dim)' }}>120 kt tailwind</span>
        <span style={{ fontSize: 9, color: 'var(--dim)' }}>120 kt headwind</span>
      </div>
    </div>
  )
}

function PhaseRow({ label, dist, time, fuel, accent = false }: {
  label: string; dist: number; time: number; fuel: number; accent?: boolean
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr',
      padding: '7px 10px', borderRadius: 'var(--r-sm)',
      background: accent ? 'var(--glass)' : 'transparent',
      borderBottom: '1px solid var(--line-2)',
    }}>
      <span style={{ fontSize: 11, color: accent ? 'var(--text)' : 'var(--muted)', fontWeight: accent ? 600 : 400 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--dim)', textAlign: 'right' }}>
        {dist > 0 ? `${Math.round(dist)} NM` : '—'}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--dim)', textAlign: 'right' }}>
        {formatTime(time)}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: accent ? 'var(--violet)' : 'var(--dim)', fontWeight: accent ? 600 : 400, textAlign: 'right' }}>
        {fuel.toFixed(2)} T
      </span>
    </div>
  )
}

function ReserveRow({ label, fuel, color = 'var(--dim)' }: { label: string; fuel: number; color?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 10px', borderBottom: '1px solid var(--line-2)',
    }}>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color }}>{fuel.toFixed(2)} T</span>
    </div>
  )
}

export default function FuelPanel({ route, arrival, alternate, selectedAircraftProfile, cruisingAltitude }) {
  const [windKts, setWindKts]           = useState(0)
  const [forecastKts, setForecastKts]   = useState<number | null>(null)
  const [windSource, setWindSource]     = useState<'manual' | 'live'>('manual')
  const [windLoading, setWindLoading]   = useState(false)
  const [departureTime, setDepartureTime] = useState<string>(utcNow)
  const abortRef = useRef<AbortController | null>(null)

  const altFt: number = cruisingAltitude ?? selectedAircraftProfile?.preferredCruiseAltitudeFt ?? 35_000

  // Auto-fetch winds when route or altitude changes
  useEffect(() => {
    const wps = (route?.waypoints ?? [])
      .filter((w: any) => w.lat != null && w.lon != null)
      .map((w: any) => ({ lat: w.lat as number, lon: w.lon as number }))

    if (wps.length < 2) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setWindLoading(true)

    fetchWinds(wps, altFt, abortRef.current.signal)
      .then(result => {
        const hw = Math.round(result.averageHeadwindKts)
        setForecastKts(hw)
        setWindKts(hw)
        setWindSource('live')
        setWindLoading(false)
      })
      .catch(err => {
        if (err?.name === 'AbortError') return
        console.warn('Winds aloft fetch failed:', err)
        setWindLoading(false)
      })

    return () => abortRef.current?.abort()
  }, [route, altFt])

  function handleWindChange(v: number) {
    setWindKts(v)
    setWindSource('manual')
  }

  function resetToForecast() {
    if (forecastKts !== null) {
      setWindKts(forecastKts)
      setWindSource('live')
    }
  }

  if (!route || !selectedAircraftProfile) return null

  const distNm = route.routeDistanceNm ?? route.waypoints?.[route.waypoints.length - 1]?.distCum ?? 0
  if (!distNm) return null

  const altDistNm = (arrival && alternate)
    ? haversineNm(arrival.lat, arrival.lon, alternate.lat, alternate.lon)
    : undefined

  const fuel: FuelBreakdown = calculateFuel({
    distanceNm: distNm, aircraftProfile: selectedAircraftProfile,
    windComponentKts: windKts, altDistanceNm: altDistNm,
  })

  // Block time = taxi out + en-route; ETA = blockOff + blockTime
  const blockTimeMin = fuel.taxi.timeMin + fuel.totalTimeMin

  const eta = (() => {
    if (!departureTime) return null
    const [hStr, mStr] = departureTime.split(':')
    const depMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10)
    if (isNaN(depMin)) return null
    const arrMin = depMin + blockTimeMin
    const arrH   = Math.floor(arrMin / 60) % 24
    const arrM   = Math.round(arrMin % 60)
    return {
      str:     `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`,
      nextDay: arrMin >= 24 * 60,
    }
  })()

  const windEffect = windKts !== 0
    ? `GS ${fuel.groundSpeedKts} kt (${windKts > 0 ? '-' : '+'}${Math.abs(Math.round(selectedAircraftProfile.cruiseSpeedKts - fuel.groundSpeedKts))} kt)`
    : `GS ${fuel.groundSpeedKts} kt`

  return (
    <div style={{
      background: 'var(--glass-2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Fuel & Performance
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{selectedAircraftProfile.icaoCode} — {selectedAircraftProfile.displayName}</div>
        </div>
        <div style={{
          padding: '5px 10px', borderRadius: 8,
          background: 'rgba(139,124,255,.1)', border: '1px solid rgba(139,124,255,.2)',
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--violet)',
        }}>
          {windEffect}
        </div>
      </div>

      {/* Departure time + ETA */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        padding: '12px 14px', borderRadius: 'var(--r)',
        background: 'var(--glass)', border: '1px solid var(--line-2)',
      }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
            Block Off (UTC)
          </div>
          <input
            type="time"
            value={departureTime}
            onChange={e => setDepartureTime(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', borderRadius: 'var(--r-sm)',
              background: 'var(--glass-2)', border: '1px solid var(--line)',
              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
              color: 'var(--text)', colorScheme: 'dark',
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
            ETA (UTC)
          </div>
          <div style={{
            padding: '6px 8px', borderRadius: 'var(--r-sm)',
            background: eta ? 'rgba(0,229,168,.06)' : 'var(--glass-2)',
            border: `1px solid ${eta ? 'rgba(0,229,168,.2)' : 'var(--line)'}`,
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
            color: eta ? 'var(--mint)' : 'var(--dim)',
            display: 'flex', alignItems: 'center', gap: 6, height: 31,
          }}>
            {eta ? eta.str : '—'}
            {eta?.nextDay && (
              <span style={{ fontSize: 9, color: 'var(--amber)', background: 'rgba(245,158,11,.1)', padding: '1px 5px', borderRadius: 4 }}>+1</span>
            )}
          </div>
        </div>
      </div>

      {/* Wind input */}
      <div style={{
        padding: '12px 14px', borderRadius: 'var(--r)',
        background: 'var(--glass)', border: '1px solid var(--line-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          {windLoading ? (
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Fetching winds…</span>
          ) : windSource === 'live' ? (
            <span style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 10,
              background: 'rgba(0,229,168,.1)', border: '1px solid rgba(0,229,168,.3)',
              color: 'var(--mint)', letterSpacing: '0.06em',
            }}>LIVE WINDS</span>
          ) : (
            <>
              <span style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 10,
                background: 'rgba(255,180,80,.1)', border: '1px solid rgba(255,180,80,.3)',
                color: 'var(--amber)', letterSpacing: '0.06em',
              }}>MANUAL</span>
              {forecastKts !== null && (
                <button
                  onClick={resetToForecast}
                  style={{
                    fontSize: 9, padding: '2px 7px', borderRadius: 10,
                    background: 'transparent', border: '1px solid var(--line)',
                    color: 'var(--muted)', cursor: 'pointer',
                  }}
                >
                  Reset to forecast ({forecastKts > 0 ? `${forecastKts} kt HW` : forecastKts < 0 ? `${Math.abs(forecastKts)} kt TW` : 'calm'})
                </button>
              )}
            </>
          )}
        </div>
        <WindSlider value={windKts} onChange={handleWindChange} />
      </div>

      {/* Phase table */}
      <div style={{ borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--line-2)' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr',
          padding: '5px 10px', background: 'var(--glass)',
          borderBottom: '1px solid var(--line)',
        }}>
          {['Phase', 'Dist', 'Time', 'Fuel'].map(h => (
            <span key={h} style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === 'Phase' ? 'left' : 'right' }}>{h}</span>
          ))}
        </div>
        <PhaseRow label="Taxi"     dist={0}                     time={fuel.taxi.timeMin}     fuel={fuel.taxi.fuelTons}    />
        <PhaseRow label="Climb"    dist={fuel.climb.distanceNm} time={fuel.climb.timeMin}    fuel={fuel.climb.fuelTons}   />
        <PhaseRow label="Cruise"   dist={fuel.cruise.distanceNm}time={fuel.cruise.timeMin}   fuel={fuel.cruise.fuelTons}  />
        <PhaseRow label="Descent"  dist={fuel.descent.distanceNm}time={fuel.descent.timeMin} fuel={fuel.descent.fuelTons} />
        <PhaseRow label="Trip Fuel" dist={distNm} time={fuel.totalTimeMin} fuel={fuel.tripFuel} accent />
      </div>

      {/* Reserves */}
      <div style={{ borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--line-2)' }}>
        <div style={{ padding: '5px 10px', background: 'var(--glass)', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reserves (ICAO)</span>
        </div>
        <ReserveRow label="Contingency (5 %)" fuel={fuel.contingency} />
        <ReserveRow label="Final Reserve (30 min)" fuel={fuel.finalReserve} />
        {fuel.alternate > 0 && (
          <ReserveRow
            label={`Alternate — ${alternate?.icao ?? 'ALTN'}`}
            fuel={fuel.alternate}
            color="var(--amber)"
          />
        )}
      </div>

      {/* Total */}
      <div style={{
        padding: '14px 16px', borderRadius: 'var(--r)',
        background: 'linear-gradient(135deg, rgba(0,229,168,.08), rgba(0,229,168,.04))',
        border: '1px solid rgba(0,229,168,.2)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Total Fuel Required
          </div>
          <div style={{ fontSize: 10, color: 'var(--dim)' }}>
            {alternate ? 'Trip + Contingency + Final Res + Alternate' : 'Trip + Contingency + Final Reserve'}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--mint)' }}>
          {fuel.totalFuel.toFixed(1)} T
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.5 }}>
        For flight simulation only. Values are approximate and based on performance data and wind component.
      </div>
    </div>
  )
}

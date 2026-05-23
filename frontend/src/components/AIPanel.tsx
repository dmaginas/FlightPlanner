function ConfidenceBar({ value }) {
  const color = value >= 80 ? 'var(--mint)' : value >= 60 ? 'var(--amber)' : 'var(--red)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Confidence</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color }}>{value}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--line)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 2, transition: 'width .6s ease',
        }} />
      </div>
    </div>
  )
}

function InsightRow({ icon, text, type = 'info' }) {
  const colors = {
    info:    { bg: 'var(--violet-dim)',  color: 'var(--violet)' },
    success: { bg: 'var(--mint-soft)',   color: 'var(--mint)'   },
    warning: { bg: 'var(--amber-soft)',  color: 'var(--amber)'  },
  }
  const c = colors[type]
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '9px 12px', borderRadius: 'var(--r-sm)',
      background: c.bg, border: `1px solid ${c.color}30`,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}

import { calculateFuel } from '../utils/fuelCalculator.ts'

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function AIPanel({ departure, arrival, alternate, route, selectedSID, selectedSTAR, selectedAircraftProfile }) {
  if (!route) return null

  const totalDist = route.waypoints[route.waypoints.length - 1]?.distCum ?? 0
  const timeMin   = route.etaMinutes ?? Math.round(totalDist / 8.5)
  const timeLabel = `${Math.floor(timeMin / 60)}h ${timeMin % 60}m`

  const altDistNm = (arrival && alternate)
    ? haversineNm(arrival.lat, arrival.lon, alternate.lat, alternate.lon)
    : undefined

  const fuel = selectedAircraftProfile && totalDist
    ? calculateFuel({ distanceNm: totalDist, aircraftProfile: selectedAircraftProfile, windComponentKts: 0, altDistanceNm: altDistNm })
    : null

  const tripFuel  = fuel?.tripFuel  ?? (route.fuelEstimateTons ?? totalDist * 0.022)
  const totalFuel = fuel?.totalFuel ?? tripFuel

  const insights = []
  if (selectedSID?.windScore === 'Favorable')  insights.push({ icon: '✓', text: `SID ${selectedSID.name}: Wind aligned — fuel-efficient departure.`, type: 'success' })
  if (selectedSTAR?.windScore === 'Favorable') insights.push({ icon: '✓', text: `STAR ${selectedSTAR.name}: Into-wind approach — stable landing conditions.`, type: 'success' })
  if (selectedSID?.windScore === 'Crosswind')  insights.push({ icon: '⚠', text: `SID ${selectedSID.name}: Crosswind departure — expect drift correction.`, type: 'warning' })
  if (selectedSTAR?.windScore === 'Tailwind')  insights.push({ icon: '⚠', text: `STAR ${selectedSTAR.name}: Tailwind on finals — consider alternate runway.`, type: 'warning' })

  insights.push({ icon: '↗', text: `Cruise at ${route.altitude} — optimal for ${totalDist} NM sector.`, type: 'info' })
  if (alternate) {
    insights.push({ icon: '⛽', text: `Trip fuel ~${tripFuel.toFixed(1)}T · Total with reserves ~${totalFuel.toFixed(1)}T (see Fuel & Performance for details).`, type: 'info' })
    insights.push({ icon: '◈', text: `Alternate ${alternate.icao} selected — ICAO fuel reserve requirement met.`, type: 'success' })
  } else {
    insights.push({ icon: '⛽', text: `Estimated trip fuel: ~${tripFuel.toFixed(1)}T — open Fuel & Performance for full breakdown.`, type: 'info' })
    insights.push({ icon: '⚠', text: 'No alternate airport set — required by ICAO regulations for IFR flights.', type: 'warning' })
  }

  const confidence = Math.min(98, 72 + (selectedSID ? 10 : 0) + (selectedSTAR ? 12 : 0))

  return (
    <div style={{
      background: 'var(--glass-2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--violet-soft), var(--mint-soft))',
          border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>✦</div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>AI Dispatcher</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Route analysis ready</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live</span>
          <span className="dot dot-pulse" style={{ display: 'inline-block', marginLeft: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', boxShadow: '0 0 8px var(--mint)' }} />
        </div>
      </div>

      {/* Key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatCell label="Distance" value={`${totalDist} NM`} />
        <StatCell label="ETE"      value={timeLabel} />
        <StatCell label="Altitude" value={route.altitude} />
        <StatCell label="Aircraft" value={route.aircraft} />
        <StatCell label="Trip Fuel"  value={`~${tripFuel.toFixed(1)} T`} />
        <StatCell
          label={alternate ? 'Total w/ ALTN' : 'Total w/ Res'}
          value={`~${totalFuel.toFixed(1)} T`}
          highlight={!!alternate}
        />
      </div>

      {/* Confidence */}
      <ConfidenceBar value={confidence} />

      {/* Insights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Dispatcher Notes</div>
        {insights.map((ins, i) => <InsightRow key={i} {...ins} />)}
      </div>

      {/* Export button */}
      <button
        style={{
          padding: '12px', borderRadius: 'var(--r)',
          background: 'linear-gradient(135deg, rgba(0,229,168,.85), rgba(0,229,168,.6))',
          color: '#041A14', fontFamily: 'var(--font-display)',
          fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
          border: 'none', cursor: 'pointer', transition: 'opacity .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        onClick={() => {
          const plan = `FlightPlanner Export\n${departure?.icao ?? '?'} → ${arrival?.icao ?? '?'}\nRoute: ${route.airway}\nAlt: ${route.altitude}\nWaypoints: ${route.waypoints.map(w => w.id).join(' ')}\nSID: ${selectedSID?.name ?? 'None'}\nSTAR: ${selectedSTAR?.name ?? 'None'}`
          navigator.clipboard?.writeText(plan).catch(() => {})
          alert('Route copied to clipboard!\n\n' + plan)
        }}
      >
        Export Flight Plan
      </button>
    </div>
  )
}

function StatCell({ label, value, highlight = false }) {
  return (
    <div style={{
      textAlign: 'center', padding: '10px 8px',
      background: highlight ? 'rgba(0,229,168,.07)' : 'var(--glass)',
      borderRadius: 'var(--r-sm)',
      border: `1px solid ${highlight ? 'rgba(0,229,168,.25)' : 'var(--line-2)'}`,
    }}>
      <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: highlight ? 'var(--mint)' : 'var(--text)' }}>{value}</div>
    </div>
  )
}

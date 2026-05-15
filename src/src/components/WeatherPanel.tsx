import { getWeather } from '../data/mockData.ts'

function WindArrow({ dir, speed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '1px solid var(--line)', background: 'var(--glass)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        position: 'relative',
      }}>
        <div style={{
          width: 2, height: 10, background: 'var(--violet)',
          borderRadius: 1, transformOrigin: 'bottom center',
          transform: `rotate(${dir}deg)`,
          marginBottom: 4,
        }} />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
          {String(dir).padStart(3, '0')}° / {speed}kt
        </div>
      </div>
    </div>
  )
}

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
  const wx = getWeather(airport.icao)

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
        <CatBadge cat={wx.cat} />
      </div>

      {/* Conditions */}
      <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 10 }}>{wx.conditions}</div>

      {/* Wind */}
      <WindArrow dir={wx.wind.dir} speed={wx.wind.spd} />
      {wx.wind.gust && (
        <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4, marginLeft: 36 }}>
          Gusting {wx.wind.gust}kt
        </div>
      )}

      {/* Data row */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <DataCell label="TEMP" value={`${wx.temp}°C`} />
        <DataCell label="VIS"  value={wx.vis >= 9999 ? '10km+' : `${(wx.vis / 1000).toFixed(1)}km`} />
        <DataCell label="QNH"  value={`${wx.qnh}`} />
      </div>

      {/* METAR */}
      <div style={{
        marginTop: 12, padding: '8px 10px', borderRadius: 'var(--r-sm)',
        background: 'rgba(0,0,0,.2)', border: '1px solid var(--line-2)',
        fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--dim)',
        lineHeight: 1.5, wordBreak: 'break-all',
      }}>
        {wx.metar}
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

      {departure ? <AirportWeather airport={departure} role="dep" /> : <EmptySlot label="Select departure airport" />}
      {arrival   ? <AirportWeather airport={arrival}   role="arr" /> : <EmptySlot label="Select arrival airport" />}
    </div>
  )
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

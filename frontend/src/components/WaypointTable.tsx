const altColor = phase => ({
  CLB: 'var(--amber)',
  CRZ: 'var(--mint)',
  DSC: 'var(--violet)',
  GND: 'var(--dim)',
}[phase] ?? 'var(--muted)')

const typeIcon = type => ({ airport: '✈', fix: '◆', vor: '◉', ndb: '◎' }[type] ?? '·')

export default function WaypointTable({ route, selectedSID, selectedSTAR }) {
  if (!route) return null

  const waypoints = route.waypoints
  const total = waypoints[waypoints.length - 1]?.distCum ?? 0

  return (
    <div style={{
      background: 'var(--glass-2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '28px 1fr 80px 70px 70px 60px',
        padding: '10px 16px', borderBottom: '1px solid var(--line)',
        background: 'var(--glass)',
      }}>
        {['', 'Waypoint', 'Airway', 'Phase', 'Dist NM', 'Remain'].map((h, i) => (
          <div key={i} style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {waypoints.map((wp, i) => {
          const remaining = total - wp.distCum
          const isFirst = i === 0
          const isLast  = i === waypoints.length - 1
          const highlight = isFirst ? 'rgba(139,124,255,.08)' : isLast ? 'rgba(0,229,168,.06)' : 'transparent'

          return (
            <div
              key={`${wp.id}-${i}`}
              style={{
                display: 'grid', gridTemplateColumns: '28px 1fr 80px 70px 70px 60px',
                padding: '9px 16px', borderBottom: '1px solid var(--line-2)',
                background: highlight, transition: 'background .1s', alignItems: 'center',
              }}
              onMouseEnter={e => { if (!isFirst && !isLast) e.currentTarget.style.background = 'var(--glass-2)' }}
              onMouseLeave={e => e.currentTarget.style.background = highlight}
            >
              <div style={{ fontSize: 12, color: isFirst ? 'var(--violet)' : isLast ? 'var(--mint)' : 'var(--dim)', textAlign: 'center' }}>
                {typeIcon(wp.type)}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{wp.id}</div>
                {wp.type === 'airport' && <div style={{ fontSize: 10, color: 'var(--dim)' }}>{isFirst ? 'Departure' : 'Arrival'}</div>}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{wp.airway ?? '—'}</div>
              <div>
                {wp.altLabel && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                    color: altColor(wp.altLabel), letterSpacing: '0.04em',
                  }}>{wp.altLabel}</span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                {wp.distCum > 0 ? wp.distCum : '—'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: isLast ? 'var(--mint)' : 'var(--dim)' }}>
                {isLast ? '—' : remaining}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer summary */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', borderTop: '1px solid var(--line)',
        background: 'var(--glass)',
      }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <SummaryItem label="Waypoints" value={waypoints.length - 2} />
          <SummaryItem label="Total NM"  value={total} />
          <SummaryItem label="Cruise"    value={route.altitude} />
        </div>
        {(selectedSID || selectedSTAR) && (
          <div style={{ display: 'flex', gap: 8 }}>
            {selectedSID  && <Tag label={selectedSID.name}  color="var(--violet)" />}
            {selectedSTAR && <Tag label={selectedSTAR.name} color="var(--mint)"   />}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryItem({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
      <span style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{value}</span>
    </div>
  )
}

function Tag({ label, color }) {
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600,
      fontFamily: 'var(--font-mono)', color, background: `${color}18`,
      border: `1px solid ${color}30`,
    }}>{label}</span>
  )
}

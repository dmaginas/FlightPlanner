import type { AlternativeRoute } from '../services/routeService'

interface Props {
  alternatives: AlternativeRoute[]
}

export default function AlternativesPanel({ alternatives }: Props) {
  if (!alternatives || alternatives.length === 0) return null

  return (
    <div style={{
      background: 'var(--glass-2)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--glass)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 12, color: 'var(--violet)' }}>◈</span>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Alternative Routes
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 10, fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          color: 'var(--violet)',
          background: 'var(--violet-dim)',
          padding: '2px 7px', borderRadius: 10,
        }}>
          {alternatives.length}
        </span>
      </div>

      {/* Rows */}
      {alternatives.map((alt, i) => (
        <div
          key={alt.id ?? i}
          style={{
            padding: '10px 16px',
            borderBottom: i < alternatives.length - 1 ? '1px solid var(--line-2)' : 'none',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          {/* Index badge */}
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--glass)',
            border: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'var(--dim)',
            flexShrink: 0,
          }}>
            {i + 2}
          </div>

          {/* Route text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {alt.routeText ? (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11, fontWeight: 500,
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {alt.routeText}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--dim)', fontStyle: 'italic' }}>
                Route details unavailable
              </div>
            )}
          </div>

          {/* Distance */}
          {alt.distanceNm != null && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              fontWeight: 600, color: 'var(--muted)',
              flexShrink: 0,
            }}>
              {Math.round(alt.distanceNm)} NM
            </div>
          )}
        </div>
      ))}

      {/* FPD attribution */}
      <div style={{
        padding: '7px 16px',
        borderTop: '1px solid var(--line-2)',
        fontSize: 10, color: 'var(--dim)', lineHeight: 1.4,
      }}>
        Data from{' '}
        <a
          href="https://flightplandatabase.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--violet)', textDecoration: 'none' }}
        >
          Flight Plan Database
        </a>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'

const FRONTEND_SERVICES: ApiServiceStatus[] = [
  {
    key:         'openaip',
    name:        'OpenAIP',
    status:      import.meta.env.VITE_OPENAIP_API_KEY ? 'ok' : 'not_configured',
    note:        import.meta.env.VITE_OPENAIP_API_KEY
      ? 'Airport search is active.'
      : 'Airport search disabled. Add VITE_OPENAIP_API_KEY to frontend/.env — register free at openaip.net.',
    keyRequired: true,
  },
  {
    key:         'owm',
    name:        'OpenWeatherMap',
    status:      import.meta.env.VITE_OWM_API_KEY ? 'ok' : 'not_configured',
    note:        import.meta.env.VITE_OWM_API_KEY
      ? 'Clouds layer is active. New keys may take up to 2 hours to activate on OWM\'s servers.'
      : 'Clouds layer hidden. Add VITE_OWM_API_KEY to frontend/.env — register free at openweathermap.org.',
    keyRequired: true,
  },
]

interface ApiServiceStatus {
  key: string
  name: string
  status: 'ok' | 'not_configured' | 'no_key_required'
  note: string
  keyRequired: boolean
}

interface HealthData {
  status: string
  name: string
  version: string
  apiServices: ApiServiceStatus[]
}

function StatusBadge({ status }: { status: ApiServiceStatus['status'] }) {
  const cfg = {
    ok:               { label: 'OK',           color: 'var(--mint)',   bg: 'rgba(0,229,168,.12)',  border: 'rgba(0,229,168,.3)'  },
    not_configured:   { label: 'NOT SET',       color: 'var(--red)',    bg: 'rgba(255,92,114,.12)', border: 'rgba(255,92,114,.3)' },
    no_key_required:  { label: 'NO KEY NEEDED', color: 'var(--violet)', bg: 'rgba(139,124,255,.1)', border: 'rgba(139,124,255,.25)'},
  }[status]

  return (
    <span style={{
      padding: '3px 10px', borderRadius: 6,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      fontFamily: 'var(--font-mono)',
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  )
}

function ServiceRow({ svc }: { svc: ApiServiceStatus }) {
  const dotColor = {
    ok:              'var(--mint)',
    not_configured:  'var(--red)',
    no_key_required: 'var(--violet)',
  }[svc.status]

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 16,
      padding: '16px 20px',
      borderBottom: '1px solid var(--line-2)',
    }}>
      {/* Status dot */}
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: dotColor,
        boxShadow: `0 0 8px ${dotColor}`,
        flexShrink: 0, marginTop: 4,
      }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {svc.name}
          </span>
          <StatusBadge status={svc.status} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
          {svc.note}
        </div>
        {svc.status === 'not_configured' && svc.note.includes('dotnet') && (
          <div style={{
            marginTop: 8, padding: '6px 10px',
            background: 'rgba(255,92,114,.08)', border: '1px solid rgba(255,92,114,.2)',
            borderRadius: 6, fontSize: 11, color: 'var(--dim)',
            fontFamily: 'var(--font-mono)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>
            {svc.note.substring(svc.note.indexOf('dotnet'))}
          </div>
        )}
      </div>

      {/* Key type tag */}
      <div style={{
        fontSize: 10, color: 'var(--dim)',
        letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0, marginTop: 3,
      }}>
        {svc.keyRequired ? 'API Key' : 'Free'}
      </div>
    </div>
  )
}

export default function ApiStatusScreen({ onBack }: { onBack: () => void }) {
  const [health, setHealth]   = useState<HealthData | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/health', { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setHealth)
      .catch(e => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  const frontendUnconfigured = FRONTEND_SERVICES.filter(s => s.status === 'not_configured').length
  const configured   = (health?.apiServices.filter(s => s.status === 'ok' || s.status === 'no_key_required').length ?? 0)
                     + FRONTEND_SERVICES.filter(s => s.status === 'ok').length
  const totalServices = (health?.apiServices.length ?? 0) + FRONTEND_SERVICES.length
  const unconfigured = (health?.apiServices.filter(s => s.status === 'not_configured').length ?? 0) + frontendUnconfigured

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={onBack}
            style={{
              padding: '7px 14px', borderRadius: 8,
              background: 'var(--glass)', border: '1px solid var(--line)',
              color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              API Status
            </h1>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              External service configuration and availability
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
            Checking API status…
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '16px 20px', borderRadius: 'var(--r)',
            background: 'rgba(255,92,114,.1)', border: '1px solid rgba(255,92,114,.3)',
            color: 'var(--text)', fontSize: 13,
          }}>
            Could not reach backend health endpoint: {error}
          </div>
        )}

        {health && (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              <SummaryCard label="Backend" value={health.name} sub={`v${health.version}`} color="var(--mint)" />
              <SummaryCard label="Ready" value={`${configured} / ${totalServices}`} sub="services configured" color="var(--mint)" />
              <SummaryCard
                label="Action needed"
                value={unconfigured === 0 ? 'None' : `${unconfigured} service${unconfigured > 1 ? 's' : ''}`}
                sub={unconfigured === 0 ? 'All APIs configured' : 'API keys missing'}
                color={unconfigured === 0 ? 'var(--mint)' : 'var(--red)'}
              />
            </div>

            {/* Service list */}
            <div style={{
              background: 'var(--glass-2)', border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)', overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 20px', background: 'var(--glass)',
                borderBottom: '1px solid var(--line)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  External Services
                </span>
                <span style={{ fontSize: 11, color: 'var(--dim)' }}>
                  {health.apiServices.length} services
                </span>
              </div>

              {health.apiServices.map(svc => (
                <ServiceRow key={svc.key} svc={svc} />
              ))}
            </div>

            {/* Frontend API keys */}
            <div style={{
              background: 'var(--glass-2)', border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)', overflow: 'hidden', marginTop: 16,
            }}>
              <div style={{
                padding: '12px 20px', background: 'var(--glass)',
                borderBottom: '1px solid var(--line)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Frontend API Keys
                </span>
                <span style={{ fontSize: 11, color: 'var(--dim)' }}>
                  {FRONTEND_SERVICES.length} services
                </span>
              </div>
              {FRONTEND_SERVICES.map(svc => (
                <ServiceRow key={svc.key} svc={svc} />
              ))}
            </div>

            {/* Setup hint */}
            {unconfigured > 0 && (
              <div style={{
                marginTop: 20, padding: '14px 18px',
                background: 'rgba(255,180,80,.07)', border: '1px solid rgba(255,180,80,.25)',
                borderRadius: 'var(--r)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.65,
              }}>
                <strong style={{ color: 'var(--amber)', display: 'block', marginBottom: 4 }}>Setup required</strong>
                Run the commands shown above in the <code style={{ fontFamily: 'var(--font-mono)' }}>backend/FlightPlanner.Api</code> directory,
                then restart the backend. API keys are stored securely in .NET user secrets and never committed to git.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      padding: '16px 18px', borderRadius: 'var(--r)',
      background: 'var(--glass-2)', border: '1px solid var(--line)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

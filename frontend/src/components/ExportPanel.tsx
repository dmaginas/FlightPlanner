import { useState } from 'react'
import { EXPORT_STRATEGIES, type ExportData, type ExportStrategy } from '../utils/exportStrategies'

function ExportButton({ strategy, onClick, loading }: {
  strategy: ExportStrategy; onClick: () => void; loading: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '14px 10px', borderRadius: 'var(--r)',
        background: loading ? 'var(--glass)' : 'var(--glass-2)',
        border: '1px solid var(--line)',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all .15s', opacity: loading ? .6 : 1,
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--glass)' }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--glass-2)' }}
    >
      <span style={{ fontSize: 22 }}>{loading ? '⏳' : strategy.icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{strategy.label}</div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{strategy.subtitle}</div>
      </div>
    </button>
  )
}

export default function ExportPanel({ route, departure, arrival, alternate, selectedAircraftProfile, selectedSID, selectedSTAR, callsign }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  if (!route || !departure || !arrival) return null

  function buildExportData(): ExportData {
    return {
      callsign:        callsign || undefined,
      departure:       { icao: departure.icao, name: departure.name, lat: departure.lat, lon: departure.lon, elevation: departure.elevation },
      arrival:         { icao: arrival.icao,   name: arrival.name,   lat: arrival.lat,   lon: arrival.lon,   elevation: arrival.elevation   },
      alternate:       alternate ? { icao: alternate.icao, name: alternate.name, lat: alternate.lat, lon: alternate.lon } : null,
      route,
      aircraftProfile: selectedAircraftProfile ?? null,
      selectedSID:     selectedSID  ?? null,
      selectedSTAR:    selectedSTAR ?? null,
    }
  }

  async function handleExport(strategy: ExportStrategy) {
    setLoadingId(strategy.id)
    try {
      await strategy.execute(buildExportData())
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div style={{
      background: 'var(--glass-2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: '16px 20px',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 12, letterSpacing: '0.02em' }}>
        EXPORT
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {EXPORT_STRATEGIES.map(strategy => (
          <ExportButton
            key={strategy.id}
            strategy={strategy}
            onClick={() => handleExport(strategy)}
            loading={loadingId === strategy.id}
          />
        ))}
      </div>
    </div>
  )
}

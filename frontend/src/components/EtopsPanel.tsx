import { useMemo } from 'react'
import { getEtopsInfo, analyseEtopsRoute } from '../utils/etopsUtils'

function fmtMin(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: highlight ? '#f59e0b' : 'var(--text)' }}>{value}</div>
    </div>
  )
}

interface Props {
  departure:       { lat: number; lon: number; icao: string } | null
  arrival:         { lat: number; lon: number; icao: string } | null
  route:           { waypoints: Array<{ lat?: number | null; lon?: number | null; type?: string }> } | null
  aircraftProfile: { icaoCode: string; cruiseSpeedKts: number; displayName: string } | null
}

export default function EtopsPanel({ departure, arrival, route, aircraftProfile }: Props) {
  const etops = useMemo(
    () => aircraftProfile ? getEtopsInfo(aircraftProfile) : null,
    [aircraftProfile?.icaoCode, aircraftProfile?.cruiseSpeedKts],
  )

  const analysis = useMemo(() => {
    if (!etops?.applicable || !departure || !arrival || !route) return null
    return analyseEtopsRoute(departure, arrival, route.waypoints, etops.radiusNm, etops.oeiSpeedKts)
  }, [etops, departure, arrival, route])

  if (!aircraftProfile) return null

  return (
    <div style={{
      background: 'var(--glass-2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: '16px 20px',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
        color: 'var(--muted)', marginBottom: 12, letterSpacing: '0.02em',
      }}>
        ETOPS
      </div>

      {/* Aircraft ETOPS rating */}
      <div style={{ marginBottom: 10 }}>
        {etops?.applicable ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', color: '#22c55e',
              }}>
                ETOPS-{etops.etopsMinutes}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{aircraftProfile.icaoCode}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              <Row label="OEI Speed"        value={`~${etops.oeiSpeedKts} kt`} />
              <Row label="Diversion Radius" value={`${etops.radiusNm} NM`} />
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              fontFamily: 'var(--font-mono)',
              background: 'rgba(107,114,128,.12)', border: '1px solid rgba(107,114,128,.3)', color: '#6b7280',
            }}>
              N/A
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Not applicable for {aircraftProfile.icaoCode}</span>
          </div>
        )}
      </div>

      {/* Route analysis */}
      {analysis && (
        <>
          <div style={{ height: 1, background: 'var(--line)', margin: '10px 0' }} />

          {/* Compliance badge */}
          <div style={{ marginBottom: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              fontFamily: 'var(--font-mono)',
              background: analysis.compliant ? 'rgba(34,197,94,.12)' : 'rgba(245,158,11,.12)',
              border: `1px solid ${analysis.compliant ? 'rgba(34,197,94,.3)' : 'rgba(245,158,11,.3)'}`,
              color: analysis.compliant ? '#22c55e' : '#f59e0b',
            }}>
              {analysis.compliant ? '✓ COMPLIANT' : '⚠ GAP DETECTED'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 4 }}>
            <Row label="Route Distance" value={`${analysis.totalDistNm} NM`} />
            <Row label="Gap"            value={analysis.gapNm > 0 ? `${analysis.gapNm} NM` : 'None'} highlight={analysis.gapNm > 0} />
            <Row label="DEP Coverage"   value={`${analysis.depCoverageNm} NM`} />
            <Row label="ARR Coverage"   value={`${analysis.arrCoverageNm} NM`} />
          </div>

          {/* ETP */}
          {analysis.etp && (
            <>
              <div style={{ height: 1, background: 'var(--line)', margin: '10px 0' }} />
              <div style={{
                fontSize: 10, fontWeight: 600, color: 'var(--dim)',
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8,
              }}>
                Equal Time Point (OEI, no wind)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                <Row label="Dist. from DEP" value={`${analysis.etp.distFromDepNm} NM`} />
                <Row label="Dist. from ARR" value={`${analysis.totalDistNm - analysis.etp.distFromDepNm} NM`} />
                <Row label={`→ ${departure?.icao ?? 'DEP'} (OEI)`} value={fmtMin(analysis.etp.timeToDepMin)} />
                <Row label={`→ ${arrival?.icao ?? 'ARR'} (OEI)`}   value={fmtMin(analysis.etp.timeToArrMin)} />
              </div>
            </>
          )}
        </>
      )}

      {!analysis && etops?.applicable && (
        <div style={{ fontSize: 11, color: 'var(--dim)', fontStyle: 'italic', marginTop: 4 }}>
          Calculate a route to see ETOPS analysis.
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 9, color: 'var(--dim)', lineHeight: 1.5 }}>
        Simplified check — considers DEP/ARR only. En-route alternates not evaluated.
      </div>
    </div>
  )
}

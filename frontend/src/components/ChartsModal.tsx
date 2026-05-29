import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { fetchCharts, chartFileUrl, type ChartInfo } from '../services/chartService'

// ── Types ─────────────────────────────────────────────────────────────────────

type ChartType = 'ALL' | 'APT' | 'APP' | 'DEP' | 'ARR' | 'REF' | 'OTHER'

const TABS: { key: ChartType; label: string }[] = [
  { key: 'ALL',   label: 'All'       },
  { key: 'APP',   label: 'Approach'  },
  { key: 'DEP',   label: 'SID'       },
  { key: 'ARR',   label: 'STAR'      },
  { key: 'APT',   label: 'Airport'   },
  { key: 'REF',   label: 'Ref'       },
]

const SOURCE_COLOR: Record<string, string> = {
  faa:      '#60a5fa',
  chartfox: '#a78bfa',
}

// ── Chart list panel ──────────────────────────────────────────────────────────

function ChartList({
  charts,
  activeTab,
  selected,
  onSelect,
}: {
  charts:   ChartInfo[]
  activeTab: ChartType
  selected:  ChartInfo | null
  onSelect:  (c: ChartInfo) => void
}) {
  const visible = activeTab === 'ALL' ? charts : charts.filter(c => c.type === activeTab)

  if (visible.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>
        No {activeTab === 'ALL' ? '' : activeTab + ' '}charts available
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {visible.map((chart, i) => {
        const isSelected = selected?.id === chart.id && selected?.source === chart.source
        return (
          <button
            key={`${chart.source}-${chart.id}-${i}`}
            onClick={() => onSelect(chart)}
            style={{
              width: '100%', textAlign: 'left', padding: '9px 14px',
              background: isSelected ? 'rgba(139,124,255,.12)' : 'transparent',
              borderBottom: '1px solid var(--line-2)',
              borderLeft: isSelected ? '2px solid var(--violet)' : '2px solid transparent',
              cursor: 'pointer', transition: 'background .1s',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--glass)' }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500,
              color: isSelected ? 'var(--text)' : 'var(--muted)',
              lineHeight: 1.4,
            }}>
              {chart.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                color: SOURCE_COLOR[chart.source] ?? 'var(--dim)',
                textTransform: 'uppercase',
              }}>
                {chart.source}
              </span>
              <span style={{
                fontSize: 9, color: 'var(--dim)',
                background: 'var(--glass)', borderRadius: 3,
                padding: '1px 4px',
              }}>
                {chart.type}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── PDF viewer ────────────────────────────────────────────────────────────────

function PdfViewer({ icao, chart }: { icao: string; chart: ChartInfo | null }) {
  if (!chart) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--dim)', fontSize: 13,
      }}>
        Select a chart to view
      </div>
    )
  }

  const src = chartFileUrl(icao, chart.source, chart.id) + '#view=Fit'

  return (
    <iframe
      key={src}
      src={src}
      style={{
        flex: 1, border: 'none', background: '#1a1a2a',
        minHeight: 0,
      }}
      title={chart.name}
    />
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function ChartsModal({
  icao,
  airportName,
  onClose,
}: {
  icao:         string
  airportName?: string
  onClose:      () => void
}) {
  const [charts,   setCharts]   = useState<ChartInfo[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ChartType>('ALL')
  const [selected, setSelected] = useState<ChartInfo | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true); setError(null); setCharts([]); setSelected(null)

    fetchCharts(icao, ctrl.signal)
      .then(d => {
        setCharts(d.charts)
        setSelected(d.charts[0] ?? null)
        setLoading(false)
      })
      .catch(e => {
        if (e?.name === 'AbortError') return
        setError('Could not load charts for this airport.')
        setLoading(false)
      })

    return () => ctrl.abort()
  }, [icao])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const tabCounts = (tab: ChartType) =>
    tab === 'ALL' ? charts.length : charts.filter(c => c.type === tab).length

  const modalW = Math.min(960, window.innerWidth - 24)
  const listW  = 240

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          borderRadius: 16, overflow: 'hidden',
          width: modalW,
          height: Math.min(780, window.innerHeight - 40),
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,.85)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 18px',
          borderBottom: '1px solid var(--line-2)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
              color: 'var(--text)', letterSpacing: '0.05em',
            }}>
              {icao} — Charts
            </div>
            {airportName && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                {airportName}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--glass-2)', border: '1px solid var(--line-2)',
              borderRadius: 8, padding: '5px 10px',
              fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        {!loading && !error && (
          <div style={{
            display: 'flex', gap: 2, padding: '8px 14px',
            borderBottom: '1px solid var(--line-2)',
            overflowX: 'auto', flexShrink: 0,
          }}>
            {TABS.filter(t => t.key === 'ALL' || tabCounts(t.key) > 0).map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                  background: activeTab === t.key ? 'rgba(139,124,255,.15)' : 'transparent',
                  border: activeTab === t.key ? '1px solid rgba(139,124,255,.35)' : '1px solid transparent',
                  color: activeTab === t.key ? 'var(--violet)' : 'var(--dim)',
                  transition: 'all .15s',
                }}
              >
                {t.label}
                {tabCounts(t.key) > 0 && (
                  <span style={{
                    marginLeft: 5, fontSize: 9,
                    color: activeTab === t.key ? 'var(--violet)' : 'var(--dim)',
                  }}>
                    {tabCounts(t.key)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, color: 'var(--muted)', fontSize: 13 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '3px solid var(--line)', borderTopColor: 'var(--violet)',
              animation: 'spin 0.8s linear infinite',
            }} />
            Loading charts…
          </div>
        )}

        {error && !loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Chart list */}
            <div style={{
              width: listW, flexShrink: 0, display: 'flex', flexDirection: 'column',
              borderRight: '1px solid var(--line-2)', minHeight: 0,
            }}>
              {charts.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>
                  No charts available
                </div>
              ) : (
                <ChartList
                  charts={charts}
                  activeTab={activeTab}
                  selected={selected}
                  onSelect={setSelected}
                />
              )}
            </div>

            {/* PDF viewer */}
            <PdfViewer icao={icao} chart={selected} />
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>,
    document.body,
  )
}

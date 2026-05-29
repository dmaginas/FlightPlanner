import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { fetchCharts, chartFileUrl, type ChartInfo } from '../services/chartService'

// ── PDF.js worker setup ───────────────────────────────────────────────────────

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

// ── Types ─────────────────────────────────────────────────────────────────────

type ChartType = 'ALL' | 'APT' | 'APP' | 'DEP' | 'ARR' | 'REF' | 'OTHER'

const TABS: { key: ChartType; label: string }[] = [
  { key: 'ALL',   label: 'All'      },
  { key: 'APP',   label: 'Approach' },
  { key: 'DEP',   label: 'SID'      },
  { key: 'ARR',   label: 'STAR'     },
  { key: 'APT',   label: 'Airport'  },
  { key: 'REF',   label: 'Ref'      },
]

const SOURCE_COLOR: Record<string, string> = {
  faa:      '#60a5fa',
  chartfox: '#a78bfa',
}

// ── PDF viewer (PDF.js canvas renderer) ──────────────────────────────────────

const TOOLBAR_H = 42

function PdfViewer({ src, chartName }: { src: string; chartName: string }) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const docRef        = useRef<PDFDocumentProxy | null>(null)
  const pageRef       = useRef<PDFPageProxy | null>(null)
  const renderTaskRef = useRef<ReturnType<PDFPageProxy['render']> | null>(null)
  const zoomRef       = useRef(1.0)

  const [numPages,    setNumPages]    = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [status,      setStatus]      = useState<'loading' | 'ok' | 'error'>('loading')
  const [zoomLevel,   setZoomLevel]   = useState(1.0)

  const drawPage = useCallback((page: PDFPageProxy) => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    renderTaskRef.current?.cancel()
    renderTaskRef.current = null

    const dpr  = window.devicePixelRatio || 1
    const vp1  = page.getViewport({ scale: 1 })

    const fitScale = Math.min(
      container.clientWidth            / vp1.width,
      (container.clientHeight - TOOLBAR_H) / vp1.height,
    ) * 0.97

    const scale = Math.max(0.05, fitScale * zoomRef.current)
    const vp    = page.getViewport({ scale: scale * dpr })

    canvas.width  = Math.round(vp.width)
    canvas.height = Math.round(vp.height)
    canvas.style.width  = `${Math.round(vp.width  / dpr)}px`
    canvas.style.height = `${Math.round(vp.height / dpr)}px`

    const task = page.render({ canvas, viewport: vp })
    renderTaskRef.current = task
    task.promise.catch(e => {
      if (e?.name !== 'RenderingCancelledException') console.warn('PDF render:', e)
    })
  }, [])

  // Load document
  useEffect(() => {
    setStatus('loading')
    setNumPages(0)
    setCurrentPage(1)
    setZoomLevel(1.0)
    zoomRef.current = 1.0
    pageRef.current = null

    let cancelled = false
    const loadTask = pdfjsLib.getDocument(src)

    loadTask.promise
      .then(doc => {
        if (cancelled) { doc.destroy(); return null }
        docRef.current?.destroy()
        docRef.current = doc
        setNumPages(doc.numPages)
        return doc.getPage(1)
      })
      .then(page => {
        if (!page || cancelled) return
        pageRef.current = page
        setStatus('ok')
        // drawPage called by the effect below, after React commits the canvas
      })
      .catch(() => { if (!cancelled) setStatus('error') })

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
    }
  }, [src])

  // Draw after canvas enters the DOM
  useEffect(() => {
    if (status !== 'ok' || !pageRef.current) return
    drawPage(pageRef.current)
  }, [status, drawPage])

  // Redraw on zoom change
  useEffect(() => {
    zoomRef.current = zoomLevel
    if (status === 'ok' && pageRef.current) drawPage(pageRef.current)
  }, [zoomLevel, status, drawPage])

  // Switch page
  useEffect(() => {
    if (currentPage === 1 || !docRef.current) return
    docRef.current.getPage(currentPage).then(page => {
      pageRef.current = page
      drawPage(page)
    })
  }, [currentPage, drawPage])

  // Redraw on container resize
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (pageRef.current) drawPage(pageRef.current)
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [drawPage])

  const zoomIn    = () => setZoomLevel(z => Math.min(+(z * 1.3).toFixed(3), 8))
  const zoomOut   = () => setZoomLevel(z => Math.max(+(z / 1.3).toFixed(3), 0.15))
  const zoomReset = () => setZoomLevel(1.0)

  const zoomed      = zoomLevel > 1.02
  const downloadName = chartName.replace(/[^\w\-. ]/g, '_') + '.pdf'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#080c1e', minHeight: 0, overflow: 'hidden' }}>

      {/* Canvas area — scrollable when zoomed in */}
      <div
        ref={containerRef}
        style={{
          flex: 1, minHeight: 0,
          overflow: zoomed ? 'auto' : 'hidden',
          display: 'flex',
          alignItems:     zoomed ? 'flex-start' : 'center',
          justifyContent: zoomed ? 'flex-start' : 'center',
          padding: zoomed ? 12 : 0,
        }}
      >
        {status === 'loading' && (
          <div style={{ color: 'var(--muted)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--violet)', animation: 'spin 0.8s linear infinite' }} />
            Loading chart…
          </div>
        )}
        {status === 'error' && (
          <div style={{ color: 'var(--dim)', fontSize: 13 }}>Could not load PDF.</div>
        )}
        {status === 'ok' && <canvas ref={canvasRef} style={{ display: 'block', flexShrink: 0 }} />}
      </div>

      {/* Toolbar */}
      {status === 'ok' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '0 12px', height: TOOLBAR_H, flexShrink: 0,
          background: 'rgba(0,0,0,0.5)', borderTop: '1px solid var(--line-2)',
        }}>
          {/* Zoom */}
          <button onClick={zoomOut}   disabled={zoomLevel <= 0.16} style={tbBtn} title="Zoom out">−</button>
          <button onClick={zoomReset} style={{ ...tbBtn, minWidth: 46, fontSize: 10 }} title="Fit page">
            {Math.round(zoomLevel * 100)}%
          </button>
          <button onClick={zoomIn}    disabled={zoomLevel >= 7.9}  style={tbBtn} title="Zoom in">+</button>

          {/* Page nav (multi-page charts) */}
          {numPages > 1 && (
            <>
              <div style={{ width: 1, height: 20, background: 'var(--line-2)', margin: '0 6px' }} />
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={tbBtn}>←</button>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', minWidth: 44, textAlign: 'center' }}>
                {currentPage} / {numPages}
              </span>
              <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage === numPages} style={tbBtn}>→</button>
            </>
          )}

          <div style={{ flex: 1 }} />

          {/* Download */}
          <a
            href={src}
            download={downloadName}
            onClick={e => e.stopPropagation()}
            style={{
              ...tbBtn,
              textDecoration: 'none', display: 'inline-flex',
              alignItems: 'center', gap: 4, padding: '3px 10px',
            }}
            title="Download PDF"
          >
            ↓ PDF
          </a>
        </div>
      )}
    </div>
  )
}

const tbBtn: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
  background: 'var(--glass)', border: '1px solid var(--line)',
  color: 'var(--muted)', fontSize: 13, lineHeight: 1.4, flexShrink: 0,
}

// ── Chart list panel ──────────────────────────────────────────────────────────

function ChartList({
  charts, activeTab, selected, onSelect,
}: {
  charts:    ChartInfo[]
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
              background:  isSelected ? 'rgba(139,124,255,.12)' : 'transparent',
              borderBottom: '1px solid var(--line-2)',
              borderLeft:  isSelected ? '2px solid var(--violet)' : '2px solid transparent',
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
                background: 'var(--glass)', borderRadius: 3, padding: '1px 4px',
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

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function ChartsModal({
  icao, airportName, onClose,
}: {
  icao:         string
  airportName?: string
  onClose:      () => void
}) {
  const [charts,    setCharts]    = useState<ChartInfo[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ChartType>('ALL')
  const [selected,  setSelected]  = useState<ChartInfo | null>(null)

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

  const tabCount = (tab: ChartType) =>
    tab === 'ALL' ? charts.length : charts.filter(c => c.type === tab).length

  const pdfSrc = selected ? chartFileUrl(icao, selected.source, selected.id) : null

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
          padding: '13px 18px', borderBottom: '1px solid var(--line-2)', flexShrink: 0,
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
          >✕</button>
        </div>

        {/* Tab bar */}
        {!loading && !error && (
          <div style={{
            display: 'flex', gap: 2, padding: '8px 14px',
            borderBottom: '1px solid var(--line-2)',
            overflowX: 'auto', flexShrink: 0,
          }}>
            {TABS.filter(t => t.key === 'ALL' || tabCount(t.key) > 0).map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                  background: activeTab === t.key ? 'rgba(139,124,255,.15)' : 'transparent',
                  border:     activeTab === t.key ? '1px solid rgba(139,124,255,.35)' : '1px solid transparent',
                  color:      activeTab === t.key ? 'var(--violet)' : 'var(--dim)',
                  transition: 'all .15s',
                }}
              >
                {t.label}
                {tabCount(t.key) > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 9, color: activeTab === t.key ? 'var(--violet)' : 'var(--dim)' }}>
                    {tabCount(t.key)}
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
            {pdfSrc ? (
              <PdfViewer src={pdfSrc} chartName={selected!.name} />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: 13 }}>
                Select a chart to view
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>,
    document.body,
  )
}

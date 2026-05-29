import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Polyline, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { fetchNatTracks, type NatTrack } from '../services/natService'

// Amber for eastbound (Americas → Europe), cyan for westbound (Europe → Americas)
const COLOR_EAST = '#f59e0b'
const COLOR_WEST = '#22d3ee'

function trackColor(track: NatTrack): string {
  return track.isEastbound ? COLOR_EAST : COLOR_WEST
}

function midPoint(route: NatTrack['route']): [number, number] {
  const mid = route[Math.floor(route.length / 2)]
  return [mid.latitude, mid.longitude]
}

function makeLabelIcon(id: string, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:11px;font-weight:700;color:#fff;border:2px solid rgba(255,255,255,0.85);box-shadow:0 2px 6px rgba(0,0,0,.4);">${id}</div>`,
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
  })
}

interface Props {
  enabledLayers: Set<string>
  /** Departure longitude — used to detect transatlantic routes for relevance highlighting */
  departureLon?: number
  /** Arrival longitude — used to detect transatlantic routes for relevance highlighting */
  arrivalLon?: number
}

function isTransatlantic(depLon?: number, arrLon?: number): boolean {
  if (depLon == null || arrLon == null) return false
  const inAmericas = (lon: number) => lon >= -100 && lon <= -20
  const inEurope   = (lon: number) => lon >= -20  && lon <= 40
  return (inAmericas(depLon) && inEurope(arrLon)) || (inEurope(depLon) && inAmericas(arrLon))
}

function relevantDirection(depLon?: number, arrLon?: number): 'east' | 'west' | null {
  if (depLon == null || arrLon == null) return null
  if (depLon < arrLon) return 'east'
  return 'west'
}

type Status = 'idle' | 'loading' | 'ok' | 'empty' | 'error'

export default function NatLayer({ enabledLayers, departureLon, arrivalLon }: Props) {
  const [tracks, setTracks] = useState<NatTrack[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const abortRef = useRef<AbortController | null>(null)
  const natEnabled = useMemo(() => enabledLayers?.has('nat') ?? false, [enabledLayers])

  useEffect(() => {
    if (!natEnabled) {
      setTracks([])
      setStatus('idle')
      return
    }

    setStatus('loading')
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    fetchNatTracks(abortRef.current.signal)
      .then(r => {
        setTracks(r.tracks)
        setStatus(r.tracks.length > 0 ? 'ok' : 'empty')
      })
      .catch(err => {
        if (err?.name === 'AbortError') return
        console.warn('NAT track fetch failed:', err)
        setStatus('error')
      })

    return () => abortRef.current?.abort()
  }, [natEnabled])

  if (!natEnabled) return null

  // Show a notice when the layer is on but no track data is available
  if (status === 'empty' || status === 'error') {
    return createPortal(
      <div style={{
        position: 'fixed', bottom: 80, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000, pointerEvents: 'none',
        background: 'rgba(15,18,40,0.97)',
        border: '1px solid rgba(245,158,11,0.40)',
        borderRadius: 8, padding: '7px 14px',
        fontSize: 12, fontFamily: 'monospace',
        color: '#f59e0b', whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(0,0,0,.45)',
      }}>
        ⚠ NAT data currently unavailable — tracks are published twice daily
      </div>,
      document.body
    ) as React.ReactElement
  }

  if (tracks.length === 0) return null

  const atlantic    = isTransatlantic(departureLon, arrivalLon)
  const routeDir    = relevantDirection(departureLon, arrivalLon)

  return (
    <>
      {tracks.map(track => {
        if (track.route.length < 2) return null

        const positions = track.route.map(p => [p.latitude, p.longitude] as [number, number])
        const color  = trackColor(track)
        const mid    = midPoint(track.route)
        const icon   = makeLabelIcon(track.id, color)

        // Dim non-relevant tracks when on an Atlantic route
        const relevant = !atlantic || routeDir == null
          || (routeDir === 'east' && track.isEastbound)
          || (routeDir === 'west' && !track.isEastbound)
        const opacity = relevant ? 1 : 0.3

        const flStr = track.flightLevels.length > 0
          ? `FL${track.flightLevels.join(' / FL')}`
          : null

        return (
          <React.Fragment key={track.id}>
            {/* White halo for contrast */}
            <Polyline
              positions={positions}
              pathOptions={{ color: '#fff', weight: 5, opacity: opacity * 0.5, dashArray: '14 7' }}
            />
            {/* Main track line */}
            <Polyline
              positions={positions}
              pathOptions={{ color, weight: 3, opacity, dashArray: '14 7' }}
            >
              <Tooltip sticky>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{track.id}</span>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  {track.isEastbound ? '→ Eastbound' : '← Westbound'}
                </div>
                {flStr && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{flStr}</div>}
              </Tooltip>
            </Polyline>
            {/* Track ID label at midpoint */}
            <Marker position={mid} icon={icon} interactive={false} />
          </React.Fragment>
        )
      })}
    </>
  )
}

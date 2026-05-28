import React, { useEffect, useMemo, useRef, useState } from 'react'
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

export default function NatLayer({ enabledLayers, departureLon, arrivalLon }: Props) {
  const [tracks, setTracks] = useState<NatTrack[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const natEnabled = useMemo(() => enabledLayers?.has('nat') ?? false, [enabledLayers])

  useEffect(() => {
    if (!natEnabled) {
      setTracks([])
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    fetchNatTracks(abortRef.current.signal)
      .then(r => setTracks(r.tracks))
      .catch(err => {
        if (err?.name !== 'AbortError') console.warn('NAT track fetch failed:', err)
      })

    return () => abortRef.current?.abort()
  }, [natEnabled])

  if (!natEnabled || tracks.length === 0) return null

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

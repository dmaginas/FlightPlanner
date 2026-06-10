import { useState, useCallback, useEffect } from 'react'
import type { RouteState } from './types/routeState'
import TopBar from './components/TopBar.tsx'
import MainScreen from './components/MainScreen.tsx'
import SIDScreen from './components/SIDScreen.tsx'
import STARScreen from './components/STARScreen.tsx'
import GRAMETScreen from './components/GRAMETScreen.tsx'
import ApiStatusScreen from './components/ApiStatusScreen.tsx'
import { getAirport } from './data/airports.ts'
import { getRoute, generateDynamicRoute } from './data/mockData.ts'
import { AIRCRAFT_PROFILE_BY_ICAO, DEFAULT_AIRCRAFT_TYPE } from './data/aircraftPerformance.ts'
import { fetchRoute, fetchPlanById, RouteServiceError, type AlternativeRoute } from './services/routeService.ts'

export default function App() {
  const [screen, setScreen]           = useState('plan')
  const [departure, setDeparture]     = useState(null)
  const [arrival, setArrival]         = useState(null)
  const [alternate, setAlternate]     = useState(null)
  const [selectedSID, setSelectedSID] = useState(null)
  const [selectedSTAR, setSelectedSTAR] = useState(null)
  const [enabledLayers, setEnabledLayers] = useState<Set<string>>(() => new Set<string>(['cflct']))
  const toggleLayer = useCallback((id: string) => {
    setEnabledLayers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  const [routeState, setRouteState]   = useState<RouteState>('idle')
  const [selectedAircraftType, setSelectedAircraftType] = useState(DEFAULT_AIRCRAFT_TYPE)
  const [cruisingAltitude, setCruisingAltitude] = useState<number | null>(null)
  const [callsign, setCallsign] = useState('')
  const [chartFoxNotif, setChartFoxNotif] = useState<'connected' | 'error' | null>(null)

  // Route state — set by handleCalculate, cleared when airports change
  const [route, setRoute]               = useState(null)
  const [routeWarning, setRouteWarning] = useState<string | null>(null)
  const [routeConfigError, setRouteConfigError] = useState<string | null>(null)
  const [alternatives, setAlternatives] = useState<AlternativeRoute[]>([])

  useEffect(() => {
    let active = true
    async function loadDefaults() {
      // Developer preset — provides a populated state for local testing; not business logic.
      const [dep, arr] = await Promise.all([getAirport('EDDF'), getAirport('EGLL')])
      if (!active) return
      setDeparture(dep)
      setArrival(arr)
    }
    loadDefaults()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const chartfox = params.get('chartfox')
    if (chartfox === 'connected' || chartfox === 'error') {
      setChartFoxNotif(chartfox)
      params.delete('chartfox')
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : '')
      window.history.replaceState(null, '', newUrl)
      setTimeout(() => setChartFoxNotif(null), 5000)
    }
  }, [])

  // ── Local fallback calculation ──────────────────────────────────────────────
  function computeLocalFallback(dep, arr, aircraftProfile) {
    return getRoute(dep.icao, arr.icao, aircraftProfile)
      ?? generateDynamicRoute(dep, arr, aircraftProfile)
  }

  // ── Calculate route ─────────────────────────────────────────────────────────
  async function handleCalculate() {
    if (!departure || !arrival) return

    setRouteState('loading')
    setRouteWarning(null)
    setRouteConfigError(null)
    setAlternatives([])
    setRoute(null)

    const aircraftProfile = AIRCRAFT_PROFILE_BY_ICAO[selectedAircraftType]

    // Use SID/STAR transition points as routing anchors when procedures are selected
    const sidPath  = selectedSID?.path
    const starPath = selectedSTAR?.path
    const depLat = sidPath?.length  ? sidPath[sidPath.length - 1][0]  : departure.lat
    const depLon = sidPath?.length  ? sidPath[sidPath.length - 1][1]  : departure.lon
    const arrLat = starPath?.length ? starPath[0][0]                  : arrival.lat
    const arrLon = starPath?.length ? starPath[0][1]                  : arrival.lon

    try {
      const result = await fetchRoute(
        {
          departure:       departure.icao,
          destination:     arrival.icao,
          departureLat:    depLat,
          departureLon:    depLon,
          destinationLat:  arrLat,
          destinationLon:  arrLon,
          aircraftType:    selectedAircraftType,
          cruisingAltitude:cruisingAltitude ?? aircraftProfile?.preferredCruiseAltitudeFt,
          routeType:       'IFR',
        },
        aircraftProfile,
      )

      setRoute(result.selectedRoute)
      setAlternatives(result.alternatives ?? [])
      if (result.warning) setRouteWarning(result.warning)
      setRouteState('ready')

    } catch (error) {
      // Hard config error — show message, no fallback
      if (error instanceof RouteServiceError && error.kind === 'config_error') {
        setRouteConfigError(
          'Flight Plan Database API key is not configured on the server. ' +
          'Please set the API key and restart the backend.'
        )
        setRouteState('idle')
        return
      }

      // All other errors — use local fallback
      const fallback = computeLocalFallback(departure, arrival, aircraftProfile)
      setRoute(fallback)
      setRouteState('ready')
      let fallbackMsg = 'Route lookup failed — showing locally calculated fallback route.'
      if (error instanceof RouteServiceError) {
        if (error.kind === 'external_api_failure')
          fallbackMsg = 'Flight Plan Database is currently unavailable — showing locally calculated fallback route.'
        else if (error.kind === 'not_found')
          fallbackMsg = 'No routes found in Flight Plan Database — showing locally calculated fallback route.'
        else if (error.kind === 'network')
          fallbackMsg = 'Cannot reach the FlightPlanner backend — showing locally calculated fallback route.'
      }
      setRouteWarning(fallbackMsg)
    }
  }

  function handleDepartureChange(apt) {
    setDeparture(apt)
    setSelectedSID(null)
    setRoute(null)
    setRouteWarning(null)
    setRouteConfigError(null)
    setAlternatives([])
    if (apt && arrival) setRouteState('idle')
  }

  function handleArrivalChange(apt) {
    setArrival(apt)
    setSelectedSTAR(null)
    setRoute(null)
    setRouteWarning(null)
    setRouteConfigError(null)
    setAlternatives([])
    if (departure && apt) setRouteState('idle')
  }

  function handleAlternateChange(apt) {
    setAlternate(apt)
  }

  async function handleSelectAlternative(planId: string) {
    if (!departure || !arrival) return

    setRouteState('loading')
    setRouteWarning(null)

    const aircraftProfile = AIRCRAFT_PROFILE_BY_ICAO[selectedAircraftType]

    try {
      const result = await fetchPlanById(planId, departure.icao, arrival.icao, aircraftProfile)
      setRoute(result.selectedRoute)
      if (result.warning) setRouteWarning(result.warning)
      setRouteState('ready')
    } catch (err) {
      setRouteState('ready')
      const isNetwork = err instanceof TypeError && err.message.includes('fetch')
      setRouteWarning(
        isNetwork
          ? 'Cannot reach the server — could not load the selected alternative route.'
          : 'Could not load the selected alternative route. Please try again.'
      )
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {chartFoxNotif && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 99999, padding: '10px 20px', borderRadius: 10, fontSize: 13,
          fontWeight: 600, pointerEvents: 'none',
          background: chartFoxNotif === 'connected' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
          border: `1px solid ${chartFoxNotif === 'connected' ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}`,
          color: chartFoxNotif === 'connected' ? '#34d399' : '#f87171',
        }}>
          {chartFoxNotif === 'connected'
            ? 'ChartFox connected — worldwide charts are now available'
            : 'ChartFox authentication failed — please try again'}
        </div>
      )}

      <TopBar
        screen={screen}
        onNavigate={setScreen}
        departure={departure}
        arrival={arrival}
        selectedSID={selectedSID}
        selectedSTAR={selectedSTAR}
        routeState={routeState}
      />

      {screen === 'plan' && (
        <MainScreen
          departure={departure}
          arrival={arrival}
          alternate={alternate}
          route={route}
          selectedSID={selectedSID}
          selectedSTAR={selectedSTAR}
          routeState={routeState}
          selectedAircraftProfile={AIRCRAFT_PROFILE_BY_ICAO[selectedAircraftType]}
          cruisingAltitude={cruisingAltitude}
          callsign={callsign}
          onAircraftChange={setSelectedAircraftType}
          onAltitudeChange={setCruisingAltitude}
          onCallsignChange={setCallsign}
          onDepartureChange={handleDepartureChange}
          onArrivalChange={handleArrivalChange}
          onAlternateChange={handleAlternateChange}
          onCalculate={handleCalculate}
          onRetry={handleCalculate}
          onNavigate={setScreen}
          onSIDChange={setSelectedSID}
          onSTARChange={setSelectedSTAR}
          routeWarning={routeWarning}
          routeConfigError={routeConfigError}
          alternatives={alternatives}
          onSelectAlternative={handleSelectAlternative}
          enabledLayers={enabledLayers}
          onToggleLayer={toggleLayer}
        />
      )}

      {screen === 'sid' && (
        <SIDScreen
          departure={departure}
          route={route}
          selectedSID={selectedSID}
          onSelect={sid => { setSelectedSID(sid); setScreen('plan') }}
          onBack={() => setScreen('plan')}
          enabledLayers={enabledLayers}
          onToggleLayer={toggleLayer}
        />
      )}

      {screen === 'star' && (
        <STARScreen
          arrival={arrival}
          route={route}
          selectedSTAR={selectedSTAR}
          onSelect={star => { setSelectedSTAR(star); setScreen('plan') }}
          onBack={() => setScreen('plan')}
          enabledLayers={enabledLayers}
          onToggleLayer={toggleLayer}
        />
      )}

      {screen === 'gramet' && (
        <GRAMETScreen
          route={route}
          departure={departure}
          arrival={arrival}
          onBack={() => setScreen('plan')}
        />
      )}

      {screen === 'apistatus' && (
        <ApiStatusScreen onBack={() => setScreen('plan')} />
      )}
    </div>
  )
}

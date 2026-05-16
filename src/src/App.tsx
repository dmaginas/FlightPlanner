import { useState, useCallback, useEffect } from 'react'
import TopBar from './components/TopBar.tsx'
import MainScreen from './components/MainScreen.tsx'
import SIDScreen from './components/SIDScreen.tsx'
import STARScreen from './components/STARScreen.tsx'
import { getAirport } from './data/airports.ts'
import { getRoute, generateDynamicRoute } from './data/mockData.ts'
import { AIRCRAFT_PROFILE_BY_ICAO, DEFAULT_AIRCRAFT_TYPE } from './data/aircraftPerformance.ts'

export default function App() {
  const [screen, setScreen]           = useState('plan')
  const [departure, setDeparture]     = useState(null)
  const [arrival, setArrival]         = useState(null)
  const [selectedSID, setSelectedSID] = useState(null)
  const [selectedSTAR, setSelectedSTAR] = useState(null)
  const [routeState, setRouteState]   = useState('ready') // idle | loading | ready
  const [selectedAircraftType, setSelectedAircraftType] = useState(DEFAULT_AIRCRAFT_TYPE)

  useEffect(() => {
    let active = true

    async function loadDefaults() {
      const [dep, arr] = await Promise.all([getAirport('EDDF'), getAirport('EGLL')])
      if (!active) return
      setDeparture(dep)
      setArrival(arr)
    }

    loadDefaults()
    return () => { active = false }
  }, [])

  const route = useCallback(() => {
    if (!departure || !arrival) return null
    const aircraftProfile = AIRCRAFT_PROFILE_BY_ICAO[selectedAircraftType]
    return getRoute(departure.icao, arrival.icao, aircraftProfile) ?? generateDynamicRoute(departure, arrival, aircraftProfile)
  }, [departure, arrival, selectedAircraftType])()

  function handleCalculate() {
    setRouteState('loading')
    setSelectedSID(null)
    setSelectedSTAR(null)
    setTimeout(() => setRouteState('ready'), 1600)
  }

  function handleDepartureChange(apt) {
    setDeparture(apt)
    setSelectedSID(null)
    if (apt && arrival) setRouteState('idle')
  }

  function handleArrivalChange(apt) {
    setArrival(apt)
    setSelectedSTAR(null)
    if (departure && apt) setRouteState('idle')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
          route={route}
          selectedSID={selectedSID}
          selectedSTAR={selectedSTAR}
          routeState={routeState}
          selectedAircraftProfile={AIRCRAFT_PROFILE_BY_ICAO[selectedAircraftType]}
          onAircraftChange={setSelectedAircraftType}
          onDepartureChange={handleDepartureChange}
          onArrivalChange={handleArrivalChange}
          onCalculate={handleCalculate}
          onNavigate={setScreen}
        />
      )}

      {screen === 'sid' && (
        <SIDScreen
          departure={departure}
          route={route}
          selectedSID={selectedSID}
          onSelect={sid => { setSelectedSID(sid); setScreen('plan') }}
          onBack={() => setScreen('plan')}
        />
      )}

      {screen === 'star' && (
        <STARScreen
          arrival={arrival}
          route={route}
          selectedSTAR={selectedSTAR}
          onSelect={star => { setSelectedSTAR(star); setScreen('plan') }}
          onBack={() => setScreen('plan')}
        />
      )}
    </div>
  )
}

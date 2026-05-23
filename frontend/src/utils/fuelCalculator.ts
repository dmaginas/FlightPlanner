/**
 * fuelCalculator.ts — Phase-based IFR fuel calculation for flight simulation.
 *
 * Models four flight phases (taxi, climb, cruise, descent) plus ICAO reserves.
 * Wind is applied only to the cruise phase as a ground-speed correction.
 *
 * All fuel values are in metric tonnes (T). All distances in NM, times in minutes.
 */

export interface AircraftPerfData {
  cruiseSpeedKts:         number
  fuelBurnTonPerHour:     number
  preferredCruiseAltitudeFt: number
  climbRateFpm:           number
  descentRateFpm:         number
}

export interface FuelInputs {
  distanceNm:       number
  aircraftProfile:  AircraftPerfData
  /** Positive = headwind (reduces ground speed), negative = tailwind. */
  windComponentKts: number
  /** Alternate leg distance in NM, if an alternate is set. */
  altDistanceNm?:   number
}

export interface FuelPhaseResult {
  distanceNm: number
  timeMin:    number
  fuelTons:   number
}

export interface FuelBreakdown {
  taxi:        FuelPhaseResult
  climb:       FuelPhaseResult
  cruise:      FuelPhaseResult
  descent:     FuelPhaseResult
  tripFuel:    number   // taxi + climb + cruise + descent
  contingency: number   // 5 % of trip fuel
  finalReserve:number   // 30 min holding at reduced power
  alternate:   number   // destination → alternate
  totalFuel:   number   // everything
  groundSpeedKts: number
  totalTimeMin:   number  // climb + cruise + descent (en-route time)
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ── Calculator ─────────────────────────────────────────────────────────────────

export function calculateFuel(inputs: FuelInputs): FuelBreakdown {
  const { distanceNm, aircraftProfile: ac, windComponentKts, altDistanceNm } = inputs
  const burn  = ac.fuelBurnTonPerHour
  const speed = ac.cruiseSpeedKts
  const altFt = ac.preferredCruiseAltitudeFt

  // ── Taxi ──────────────────────────────────────────────────────────────────
  // 15 min ground operation at ~12 % of cruise burn (engines at idle/taxi power)
  const taxiTimeMin = 15
  const taxiFuel    = (taxiTimeMin / 60) * burn * 0.12

  // ── Climb ─────────────────────────────────────────────────────────────────
  // Time to reach cruise altitude; average TAS during climb ≈ 75 % of cruise
  const climbTimeMin   = altFt / ac.climbRateFpm
  const climbSpeedKts  = speed * 0.75
  const climbDistNm    = (climbTimeMin / 60) * climbSpeedKts
  // Climb fuel burn ≈ 140 % of cruise rate (higher power setting)
  const climbFuel      = (climbTimeMin / 60) * burn * 1.4

  // ── Descent ───────────────────────────────────────────────────────────────
  // Average TAS during descent ≈ 85 % of cruise
  const descentTimeMin  = altFt / ac.descentRateFpm
  const descentSpeedKts = speed * 0.85
  const descentDistNm   = (descentTimeMin / 60) * descentSpeedKts
  // Descent fuel burn ≈ 35 % of cruise rate (near-idle thrust)
  const descentFuel     = (descentTimeMin / 60) * burn * 0.35

  // ── Cruise ────────────────────────────────────────────────────────────────
  const cruiseDistNm    = clamp(distanceNm - climbDistNm - descentDistNm, 10, Infinity)
  // Ground speed: headwind (+) reduces GS, tailwind (-) increases GS
  const groundSpeedKts  = clamp(speed - windComponentKts, speed * 0.4, speed * 1.35)
  const cruiseTimeMin   = (cruiseDistNm / groundSpeedKts) * 60
  const cruiseFuel      = (cruiseTimeMin / 60) * burn

  // ── Trip fuel ─────────────────────────────────────────────────────────────
  const tripFuel = taxiFuel + climbFuel + cruiseFuel + descentFuel

  // ── Reserves ──────────────────────────────────────────────────────────────
  // ICAO contingency: 5 % of trip fuel
  const contingency = tripFuel * 0.05

  // ICAO final reserve: 30 min at holding power (~80 % of cruise burn)
  const finalReserve = (30 / 60) * burn * 0.8

  // Alternate: straightforward cruise at 100 % burn (no phase model for simplicity)
  const alternate = altDistanceNm
    ? (altDistanceNm / groundSpeedKts) * burn
    : 0

  const totalFuel    = tripFuel + contingency + finalReserve + alternate
  const totalTimeMin = climbTimeMin + cruiseTimeMin + descentTimeMin

  return {
    taxi:    { distanceNm: 0,            timeMin: taxiTimeMin,    fuelTons: taxiFuel    },
    climb:   { distanceNm: climbDistNm,  timeMin: climbTimeMin,   fuelTons: climbFuel   },
    cruise:  { distanceNm: cruiseDistNm, timeMin: cruiseTimeMin,  fuelTons: cruiseFuel  },
    descent: { distanceNm: descentDistNm,timeMin: descentTimeMin, fuelTons: descentFuel },
    tripFuel:     round2(tripFuel),
    contingency:  round2(contingency),
    finalReserve: round2(finalReserve),
    alternate:    round2(alternate),
    totalFuel:    round2(totalFuel),
    groundSpeedKts: Math.round(groundSpeedKts),
    totalTimeMin:   Math.round(totalTimeMin),
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

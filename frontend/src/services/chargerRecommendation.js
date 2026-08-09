/**
 * Recommendation engine — ranks candidate stations for a trip.
 *
 * This replaces the earlier weighted-scoring version
 * (availabilityScore * 0.25 + waitScore * 0.20 + ...). That approach
 * had two problems: the weights were arbitrary with no way to explain
 * *why* a station won, and its Emergency Mode never actually used ETA
 * or battery-on-arrival despite the README promising it would.
 *
 * Normal mode priority (high -> low):
 *   1. Reachability (hard filter when a vehicle is known)
 *   2. journeyDelayMin = routeDeviationMin + predictedWaitMin
 *      (this is the "time actually lost" number — a farther station
 *      with a much shorter queue can legitimately beat a closer one
 *      with a long line, and the number makes that explainable)
 *   3. Tie-breakers: charging speed, then rating
 *
 * Emergency mode collapses everything to: can I reach it, how fast
 * can I get there, what's the wait, and how much battery is left on
 * arrival. Ratings/amenities/price are ignored entirely.
 */

import { predictWait } from './predictWait'
import {
  AVG_ROUTE_SPEED_KMH,
  AVG_DETOUR_SPEED_KMH,
  SAFETY_BUFFER_PERCENT,
  WAIT_ADVANTAGE_THRESHOLD_MIN,
} from '../lib/config'

/**
 * @param {Array} stations - output of discoverStationsAlongRoute
 *   (each already carries distanceKm + routeProgressKm)
 * @param {{batteryPercent:number, estimatedRangeKm:number} | null} vehicle
 * @param {boolean} emergencyMode
 */
export function rankStations(stations, vehicle, emergencyMode) {
  const enriched = stations.map((station) => {
    const distanceToStationKm = station.routeProgressKm + (station.distanceKm ?? 0)
    const routeDeviationMin = Math.round(
      ((station.distanceKm ?? 0) / AVG_DETOUR_SPEED_KMH) * 60 * 2 // there and back
    )
    const etaMin = Math.round((distanceToStationKm / AVG_ROUTE_SPEED_KMH) * 60)
    const { predictedWaitMin, source } = predictWait(station)

    let reachable = true
    let batteryOnArrivalPercent = null
    if (vehicle?.estimatedRangeKm) {
      const batteryUsedPercent = (distanceToStationKm / vehicle.estimatedRangeKm) * 100
      batteryOnArrivalPercent = Math.round(vehicle.batteryPercent - batteryUsedPercent)
      reachable = batteryOnArrivalPercent >= SAFETY_BUFFER_PERCENT
    }

    return {
      ...station,
      deviationKm: station.distanceKm ?? 0, // alias matching StationCard's existing prop name
      routeDeviationMin,
      waitMin: predictedWaitMin, // alias matching StationCard's existing prop name
      predictedWaitMin,
      waitSource: source,
      journeyDelayMin: routeDeviationMin + predictedWaitMin,
      distanceToStationKm: Math.round(distanceToStationKm * 10) / 10,
      etaMin,
      reachable,
      batteryOnArrivalPercent,
      availableChargers:
        station.liveAvailableChargers ??
        Math.max(0, station.totalChargers - Math.ceil(station.totalChargers / 3)), // rough placeholder until every station has a live reading
    }
  })

  // Prefer reachable stations, but don't leave the driver with an
  // empty list if nothing qualifies — surface the closest option with
  // a warning reason instead (see buildReason).
  const anyReachable = enriched.some((s) => s.reachable)
  const candidates = vehicle && anyReachable ? enriched.filter((s) => s.reachable) : enriched

  const sorted = emergencyMode
    ? [...candidates].sort((a, b) => a.etaMin + a.waitMin - (b.etaMin + b.waitMin))
    : [...candidates].sort((a, b) => {
        if (a.journeyDelayMin !== b.journeyDelayMin) return a.journeyDelayMin - b.journeyDelayMin
        const speedDiff = (b.speedKW ?? 0) - (a.speedKW ?? 0)
        if (speedDiff !== 0) return speedDiff
        return (b.rating ?? 0) - (a.rating ?? 0)
      })

  return sorted.map((station, index) => ({
    ...station,
    reason: buildReason(station, index, sorted, emergencyMode, vehicle),
    // Monotonic with the actual sort key so the displayed badge never
    // contradicts the order stations appear in.
    recommendationScore: emergencyMode
      ? Math.max(0, 100 - (station.etaMin + station.waitMin))
      : Math.max(0, 100 - station.journeyDelayMin),
  }))
}

function buildReason(station, index, all, emergencyMode, vehicle) {
  if (emergencyMode) {
    if (vehicle && !station.reachable) {
      return 'Closest option — may not be safely reachable on current battery.'
    }
    if (index === 0) {
      return `Safest reachable charger — ${station.etaMin} min away, ~${station.batteryOnArrivalPercent}% battery on arrival.`
    }
    return `${station.etaMin} min away, ${station.waitMin} min predicted wait, ~${station.batteryOnArrivalPercent}% on arrival.`
  }

  if (index === 0) {
    const runnerUp = all[1]
    if (runnerUp && station.waitMin < runnerUp.waitMin - WAIT_ADVANTAGE_THRESHOLD_MIN) {
      return 'Lowest predicted journey delay — shorter wait outweighs the extra distance.'
    }
    return 'Lowest predicted journey delay.'
  }

  if (vehicle && !station.reachable) {
    return 'Outside comfortable range on current battery.'
  }
  if (station.waitMin > 15) {
    return 'Longer wait expected right now.'
  }
  return `${station.deviationKm} km off-route, ${station.waitMin} min predicted wait.`
}

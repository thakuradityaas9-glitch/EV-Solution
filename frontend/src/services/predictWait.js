import { simulateWaitMinutes } from './simulateWait'
import { LIVE_DATA_STALE_AFTER_MIN } from '../lib/config'

/**
 * Prefers cv-service's live reading when it exists and is recent;
 * otherwise falls back to the simulation. This is the one function
 * to change if the freshness policy or fallback strategy ever needs
 * to change — chargerRecommendation.js doesn't need to know which
 * source it got.
 */
export function predictWait(station) {
  if (station.livePredictedWaitMin != null && station.liveUpdatedAt) {
    const ageMin = (Date.now() - new Date(station.liveUpdatedAt).getTime()) / 60000
    if (ageMin <= LIVE_DATA_STALE_AFTER_MIN) {
      return { predictedWaitMin: station.livePredictedWaitMin, source: 'cctv' }
    }
  }
  return { predictedWaitMin: simulateWaitMinutes(station), source: 'simulated' }
}

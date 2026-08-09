/** Simple deterministic string hash -> [0, 1), so the same station
 * always gets the same simulated wait within a session. */
function hashToUnitInterval(input) {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return (hash >>> 0) / 0xffffffff
}

/**
 * Simulates predicted wait time in minutes for a station that has no
 * live CCTV reading yet. Stations with more chargers get a lower
 * average wait ceiling; the hash adds per-station variance.
 */
export function simulateWaitMinutes(station) {
  const variance = hashToUnitInterval(station.id)
  const capacityFactor = Math.max(1, station.totalChargers)
  const baseMax = 30 / Math.sqrt(capacityFactor)
  const wait = 1 + variance * baseMax
  return Math.round(wait)
}

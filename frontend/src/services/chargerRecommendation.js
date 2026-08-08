/**
 * Calculate a recommendation score for an EV charging station.
 *
 * The score combines:
 * - Charger availability
 * - Waiting time
 * - Distance
 * - Charging speed
 * - Station rating
 * - Route deviation
 *
 * Higher score = better recommendation.
 */

export function calculateStationScore(station) {
  if (!station.reachable || station.availableChargers <= 0) {
    return 0
  }

  const availabilityScore =
    (station.availableChargers / station.totalChargers) * 100

  const waitScore = Math.max(0, 100 - station.waitMin * 5)

  const distanceScore = Math.max(0, 100 - station.distanceKm * 10)

  const chargingSpeedScore = Math.min(
    100,
    (station.speedKW / 180) * 100
  )

  const ratingScore = (station.rating / 5) * 100

  const deviationScore = Math.max(
    0,
    100 - station.deviationKm * 30
  )

  const finalScore =
    availabilityScore * 0.25 +
    waitScore * 0.20 +
    distanceScore * 0.15 +
    chargingSpeedScore * 0.15 +
    ratingScore * 0.10 +
    deviationScore * 0.15

  return Math.round(finalScore)
}

/**
 * Return stations sorted from best to worst.
 */
export function rankChargingStations(stations) {
  return stations
    .filter(
      (station) =>
        station.reachable && station.availableChargers > 0
    )
    .map((station) => ({
      ...station,
      calculatedScore: calculateStationScore(station),
    }))
    .sort(
      (a, b) => b.calculatedScore - a.calculatedScore
    )
}

/**
 * Return the best available charging station.
 */
export function findBestChargingStation(stations) {
  const rankedStations = rankChargingStations(stations)

  return rankedStations.length > 0
    ? rankedStations[0]
    : null
}

export function findEmergencyChargingStation(stations) {
  const emergencyStations = stations
    .filter(
      (station) =>
        station.reachable &&
        station.availableChargers > 0
    )
    .map((station) => {
      const waitScore = Math.max(
        0,
        100 - station.waitMin * 10
      )

      const availabilityScore =
        (station.availableChargers / station.totalChargers) * 100

      const speedScore = Math.min(
        100,
        (station.speedKW / 180) * 100
      )

      const emergencyScore =
        waitScore * 0.45 +
        availabilityScore * 0.30 +
        speedScore * 0.25

      return {
        ...station,
        emergencyScore: Math.round(emergencyScore),
      }
    })
    .sort(
      (a, b) => b.emergencyScore - a.emergencyScore
    )

  return emergencyStations.length > 0
    ? emergencyStations[0]
    : null
}
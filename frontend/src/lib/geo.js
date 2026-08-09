/**
 * Distance math for the station-discovery corridor filter.
 * Pure functions, no dependencies — easy to unit test on their own.
 */

/** Haversine distance between two {lat, lng} points, in kilometers. */
export function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Shortest distance (km) from a point to a route path, approximated by
 * sampling the path's vertices. Good enough for corridor filtering at
 * city/highway scale.
 */
export function distanceToRouteKm(point, path) {
  if (!path || path.length === 0) return Infinity
  let min = Infinity
  for (const p of path) {
    const d = haversineKm(point, p)
    if (d < min) min = d
  }
  return min
}

/**
 * Distance (km) traveled along the route up to the closest point to
 * `point` — used to order results "in travel order" rather than just
 * by straight-line distance, and to estimate how far a driver has to
 * actually drive to reach a station.
 */
export function progressAlongRouteKm(point, path) {
  if (!path || path.length === 0) return 0
  let min = Infinity
  let closestIdx = 0
  path.forEach((p, i) => {
    const d = haversineKm(point, p)
    if (d < min) {
      min = d
      closestIdx = i
    }
  })

  let cumulative = 0
  for (let i = 1; i <= closestIdx; i++) {
    cumulative += haversineKm(path[i - 1], path[i])
  }
  return cumulative
}

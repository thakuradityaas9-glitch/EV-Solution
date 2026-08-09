import { distanceToRouteKm, progressAlongRouteKm } from '../lib/geo'
import { DISCOVERY_CONFIG } from '../lib/config'

/**
 * Filters `allStations` down to ones actually near the route, and
 * attaches distanceKm (perpendicular distance to the route) and
 * routeProgressKm (how far along the trip that point is) to each —
 * both consumed by chargerRecommendation.js for ranking.
 *
 * Stops at MAX_RADIUS_KM or MAX_STATIONS, whichever limit is hit
 * first, same rule as the rest of the project.
 */
export function discoverStationsAlongRoute(routePath, allStations) {
  return allStations
    .map((station) => {
      const point = { lat: station.latitude, lng: station.longitude }
      return {
        ...station,
        distanceKm: Math.round(distanceToRouteKm(point, routePath) * 10) / 10,
        routeProgressKm: progressAlongRouteKm(point, routePath),
      }
    })
    .filter((s) => s.distanceKm <= DISCOVERY_CONFIG.MAX_RADIUS_KM)
    .sort((a, b) => a.routeProgressKm - b.routeProgressKm)
    .slice(0, DISCOVERY_CONFIG.MAX_STATIONS)
}

/**
 * Backend-configurable values for station discovery — change here,
 * nowhere else.
 */
export const DISCOVERY_CONFIG = {
  // Stop searching once EITHER limit is reached, whichever comes first.
  MAX_RADIUS_KM: 20,
  MAX_STATIONS: 20,
}

// If cv-service hasn't refreshed a station in longer than this, treat
// its live reading as too stale to trust and fall back to the
// simulation instead of showing a queue estimate from an hour ago.
export const LIVE_DATA_STALE_AFTER_MIN = 30

// Don't recommend a station if the vehicle would arrive with less
// than this much battery left.
export const SAFETY_BUFFER_PERCENT = 5

// Used to convert distances into rough time estimates.
export const AVG_ROUTE_SPEED_KMH = 40 // main route
export const AVG_DETOUR_SPEED_KMH = 25 // local/off-route roads are slower

// "Wait outweighs the extra distance" reasoning cutoff, in minutes.
export const WAIT_ADVANTAGE_THRESHOLD_MIN = 5

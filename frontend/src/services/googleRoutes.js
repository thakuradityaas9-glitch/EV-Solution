/**
 * Thin wrappers around the Google Maps JS SDK, reusing the exact same
 * loading pattern DriverMap.jsx already established (the SDK is
 * loaded once by <APIProvider> and attaches to the global `window.google`
 * — it's not scoped to a component, so plain service functions can
 * call it directly, same as DriverMap.jsx's own MapRoute component does).
 */

/** Resolves once window.google.maps is available, rejects after a
 * timeout — guards against calling these before <APIProvider>'s
 * script tag has finished loading (e.g. a very fast form submit
 * right after page load). */
function waitForGoogle(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google)
      return
    }
    const start = Date.now()
    const interval = setInterval(() => {
      if (window.google?.maps) {
        clearInterval(interval)
        resolve(window.google)
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        reject(new Error('Google Maps failed to load in time'))
      }
    }, 100)
  })
}

/** Converts a free-text address into {lat, lng}. Geocoder is part of
 * the core Maps JS API — no extra library import needed beyond the
 * base script <APIProvider> already loads. */
export async function geocodeAddress(address) {
  const google = await waitForGoogle()
  const geocoder = new google.maps.Geocoder()

  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location
        resolve({ lat: loc.lat(), lng: loc.lng() })
      } else {
        reject(new Error(`Could not find location for "${address}" (${status})`))
      }
    })
  })
}

/** Browser geolocation, wrapped as a promise — the "use my current
 * location" option for the From field. */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(`Could not get current location: ${err.message}`)),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  })
}

/**
 * Computes a driving route between two {lat, lng} points using the
 * Maps JS SDK's Routes library — same call DriverMap.jsx already
 * makes for route rendering, factored out here so the search flow
 * and the map can share one result instead of computing the route
 * twice.
 */
export async function computeRoute(origin, destination) {
  const google = await waitForGoogle()
  const { Route } = await google.maps.importLibrary('routes')

  const { routes } = await Route.computeRoutes({
    origin,
    destination,
    travelMode: 'DRIVING',
    fields: ['path', 'distanceMeters', 'durationMillis'],
  })

  if (!routes || routes.length === 0) {
    throw new Error('No route found between these locations')
  }

  const route = routes[0]
  const path = (route.path || []).map((p) => ({
    lat: typeof p.lat === 'function' ? p.lat() : p.lat,
    lng: typeof p.lng === 'function' ? p.lng() : p.lng,
  }))

  return {
    path,
    distanceKm: Math.round((route.distanceMeters / 1000) * 10) / 10,
    durationMin: Math.round(route.durationMillis / 60000),
  }
}

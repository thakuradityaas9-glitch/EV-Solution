import { memo, useCallback, useEffect } from 'react'
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
} from '@vis.gl/react-google-maps'

// Fallback center only used before any search has run (Chandigarh —
// matches the seeded demo stations). Once a search runs, the map
// centers on the real origin/route instead.
const FALLBACK_CENTER = { lat: 28.6139, lng: 77.2090 }
const MAP_ZOOM = 13
const ROUTE_ZOOM = 14

const StationGoogleMarker = memo(function StationGoogleMarker({
  station,
  onClick,
  isRecommended,
  emergencyMode,
}) {
  const availabilityPercentage =
    station.totalChargers > 0
      ? (station.availableChargers / station.totalChargers) * 100
      : 0

  let markerColor = '#34D399'
  if (emergencyMode && station.reachable === false) {
    markerColor = '#EF4444' // unreachable takes priority over occupancy color in Emergency Mode
  } else if (station.availableChargers === 0) {
    markerColor = '#EF4444'
  } else if (availabilityPercentage <= 35) {
    markerColor = '#FBBF24'
  }

  const handleClick = useCallback(() => {
    onClick(station)
  }, [onClick, station])

  return (
    <AdvancedMarker
      position={{ lat: station.latitude, lng: station.longitude }}
      title={station.name}
      onClick={handleClick}
    >
      <div className="relative">
        {isRecommended && (
          <div className="absolute -inset-2 rounded-full bg-cyan-400/30" />
        )}

        <div
          className={`relative flex h-11 w-11 items-center justify-center rounded-full border-4 border-white shadow-lg ${
            isRecommended ? 'scale-125' : ''
          }`}
          style={{ backgroundColor: markerColor }}
        >
          <span className="text-lg">⚡</span>
        </div>

        <div
          className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white px-1 text-[10px] font-bold text-white"
          style={{ backgroundColor: markerColor }}
        >
          {station.availableChargers}
        </div>

        {isRecommended && (
          <div className="absolute left-1/2 top-14 -translate-x-1/2 whitespace-nowrap rounded-full bg-cyan-700 px-3 py-1 text-[11px] font-bold text-white shadow-lg">
            Recommended
          </div>
        )}
      </div>
    </AdvancedMarker>
  )
})

const OriginMarker = memo(function OriginMarker({ position, label }) {
  if (!position) return null
  return (
    <AdvancedMarker position={position} title={label}>
      <div className="relative">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-blue-600 shadow-lg">
          <div className="h-2 w-2 rounded-full bg-white" />
        </div>
        <div className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-md">
          {label}
        </div>
      </div>
    </AdvancedMarker>
  )
})

/** Draws the already-computed route path as a polyline — the route is
 * computed once by the search flow (services/googleRoutes.js) and
 * passed down, rather than this component computing its own route the
 * way the old version did (which meant the map's route and the actual
 * search results could silently disagree). */
function RoutePolyline({ path, color }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !path || path.length === 0) return

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.9,
      strokeWeight: 5,
    })
    polyline.setMap(map)

    return () => polyline.setMap(null)
  }, [map, path, color])

  return null
}

function MapCameraController({ origin, recommendedStation, routePath }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    if (routePath && routePath.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      routePath.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, 64)
    } else if (recommendedStation) {
      map.panTo({ lat: recommendedStation.latitude, lng: recommendedStation.longitude })
      map.setZoom(ROUTE_ZOOM)
    } else if (origin) {
      map.panTo(origin)
      map.setZoom(MAP_ZOOM)
    }
  }, [map, origin, recommendedStation, routePath])

  return null
}

function MapControls({ origin, recommendedStation, routePath }) {
  const map = useMap()

  const zoomIn = useCallback(() => {
    if (!map) return
    map.setZoom(Math.min((map.getZoom() ?? MAP_ZOOM) + 1, 20))
  }, [map])

  const zoomOut = useCallback(() => {
    if (!map) return
    map.setZoom(Math.max((map.getZoom() ?? MAP_ZOOM) - 1, 3))
  }, [map])

  const resetView = useCallback(() => {
    if (!map) return
    if (routePath && routePath.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      routePath.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, 64)
    } else if (recommendedStation) {
      map.panTo({ lat: recommendedStation.latitude, lng: recommendedStation.longitude })
      map.setZoom(ROUTE_ZOOM)
    } else if (origin) {
      map.panTo(origin)
      map.setZoom(MAP_ZOOM)
    } else {
      map.panTo(FALLBACK_CENTER)
      map.setZoom(MAP_ZOOM)
    }
  }, [map, origin, recommendedStation, routePath])

  return (
    <div className="absolute right-4 top-4 z-40 flex flex-col gap-2">
      <button
        type="button"
        onClick={zoomIn}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-800 shadow-lg transition hover:bg-slate-50"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        onClick={zoomOut}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-800 shadow-lg transition hover:bg-slate-50"
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        type="button"
        onClick={resetView}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-800 shadow-lg transition hover:bg-slate-50"
        title="Recenter map"
        aria-label="Recenter map"
      >
        ⌂
      </button>
    </div>
  )
}

const MapControlsMemo = memo(MapControls)

/**
 * @param {Array} stations - ranked stations to show as markers (real
 *   Supabase data, already carrying lat/lng)
 * @param {{lat:number,lng:number}|null} origin - resolved origin
 *   (geocoded "From" text, or the browser's geolocation)
 * @param {string} originLabel - "Current Location" or the typed From text
 * @param {Array<{lat:number,lng:number}>|null} routePath - the actual
 *   computed route, or null before a search has run
 * @param {object|null} recommendedStation
 * @param {boolean} emergencyMode
 * @param {(station:object)=>void} onStationSelect
 */
export default function DriverMap({
  stations = [],
  origin,
  originLabel = 'You',
  routePath,
  recommendedStation,
  emergencyMode = false,
  onStationSelect,
}) {
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID

  const handleStationClick = useCallback(
    (station) => {
      onStationSelect?.(station)
    },
    [onStationSelect]
  )

  const center = origin || FALLBACK_CENTER

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
      <div className="relative h-[520px] w-full">
        <APIProvider
          apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
          libraries={['routes']}
        >
          <Map
            defaultCenter={center}
            defaultZoom={MAP_ZOOM}
            mapId={mapId || undefined}
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={false}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl
            renderingType="RASTER"
            className="h-full w-full"
          >
            <OriginMarker position={origin} label={originLabel} />

            {stations.map((station) => (
              <StationGoogleMarker
                key={station.id}
                station={station}
                onClick={handleStationClick}
                isRecommended={recommendedStation?.id === station.id}
                emergencyMode={emergencyMode}
              />
            ))}

            <MapCameraController
              origin={origin}
              recommendedStation={recommendedStation}
              routePath={routePath}
            />

            <RoutePolyline path={routePath} color={emergencyMode ? '#dc2626' : '#2563eb'} />

            <MapControlsMemo
              origin={origin}
              recommendedStation={recommendedStation}
              routePath={routePath}
            />
          </Map>
        </APIProvider>

        <div className="absolute left-4 top-4 z-40 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
            Live Charging Network
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {stations.length} station{stations.length === 1 ? '' : 's'}{' '}
            {routePath ? 'along your route' : 'nearby'}
          </p>
        </div>

        <div className="absolute bottom-4 left-4 z-40 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {emergencyMode ? 'Reachability' : 'Station availability'}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-slate-700">
            {emergencyMode ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  Reachable
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  Risky
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  Available
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  Limited
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  Full
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

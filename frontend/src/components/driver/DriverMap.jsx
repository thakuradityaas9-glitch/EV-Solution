import { memo, useCallback, useEffect, useState } from 'react'
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
} from '@vis.gl/react-google-maps'
import { driverStations } from '../../data/driverStations.js'

const DEFAULT_CENTER = {
  lat: 30.3398,
  lng: 76.3869,
}

const CURRENT_LOCATION = {
  lat: 30.3335,
  lng: 76.3785,
}

const MAP_ZOOM = 13
const ROUTE_ZOOM = 14

const StationGoogleMarker = memo(function StationGoogleMarker({
  station,
  onClick,
  isRecommended,
}) {
  const availabilityPercentage =
    (station.availableChargers / station.totalChargers) * 100

  let markerColor = '#34D399'

  if (station.availableChargers === 0) {
    markerColor = '#EF4444'
  } else if (availabilityPercentage <= 35) {
    markerColor = '#FBBF24'
  }

  const handleClick = useCallback(() => {
    onClick(station)
  }, [onClick, station])

  return (
    <AdvancedMarker
      position={{
        lat: station.latitude,
        lng: station.longitude,
      }}
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

const CurrentLocationMarker = memo(function CurrentLocationMarker() {
  return (
    <AdvancedMarker position={CURRENT_LOCATION} title="Your location">
      <div className="relative">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-blue-600 shadow-lg">
          <div className="h-2 w-2 rounded-full bg-white" />
        </div>

        <div className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-md">
          You
        </div>
      </div>
    </AdvancedMarker>
  )
})

function MapRoute({ destination }) {
  const map = useMap()
  const [route, setRoute] = useState(null)

  useEffect(() => {
    if (!map || !destination) {
      setRoute(null)
      return
    }

    let cancelled = false

    async function calculateRoute() {
      try {
        const { Route } = await google.maps.importLibrary('routes')

        const { routes } = await Route.computeRoutes({
          origin: CURRENT_LOCATION,
          destination: {
            lat: destination.latitude,
            lng: destination.longitude,
          },
          travelMode: 'DRIVING',
          fields: ['path', 'distanceMeters', 'durationMillis'],
        })

        if (!cancelled && routes?.length > 0) {
          setRoute(routes[0])
        }
      } catch (error) {
        console.error('Google Maps route error:', error)
      }
    }

    calculateRoute()

    return () => {
      cancelled = true
    }
  }, [map, destination])

  useEffect(() => {
    if (!map || !route?.path) return

    const polyline = new google.maps.Polyline({
      path: route.path,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.9,
      strokeWeight: 5,
    })

    polyline.setMap(map)

    return () => {
      polyline.setMap(null)
    }
  }, [map, route])

  return null
}

function MapCameraController({ recommendedStation }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !recommendedStation) return

    map.panTo({
      lat: recommendedStation.latitude,
      lng: recommendedStation.longitude,
    })

    map.setZoom(ROUTE_ZOOM)
  }, [map, recommendedStation])

  return null
}

function MapControls({ showRoute, onRouteToggle }) {
  const map = useMap()

  const zoomIn = useCallback(() => {
    if (!map) return

    const currentZoom = map.getZoom() ?? MAP_ZOOM
    map.setZoom(Math.min(currentZoom + 1, 20))
  }, [map])

  const zoomOut = useCallback(() => {
    if (!map) return

    const currentZoom = map.getZoom() ?? MAP_ZOOM
    map.setZoom(Math.max(currentZoom - 1, 3))
  }, [map])

  const resetMap = useCallback(() => {
    if (!map) return

    map.panTo(DEFAULT_CENTER)
    map.setZoom(MAP_ZOOM)
  }, [map])

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
        onClick={resetMap}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-800 shadow-lg transition hover:bg-slate-50"
        title="Reset map"
        aria-label="Reset map"
      >
        ⌂
      </button>

      <button
        type="button"
        onClick={onRouteToggle}
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold shadow-lg transition ${
          showRoute
            ? 'bg-cyan-700 text-white'
            : 'bg-white text-slate-800 hover:bg-slate-50'
        }`}
        title="Show route"
        aria-label="Toggle route"
      >
        ➜
      </button>
    </div>
  )
}

const MapControlsMemo = memo(MapControls)

export default function DriverMap({
  onStationSelect,
  recommendedStation,
  showRoute,
  onRouteToggle,
}) {
  const [selectedRouteStation, setSelectedRouteStation] = useState(null)

  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID

  const routeDestination = showRoute
    ? recommendedStation || selectedRouteStation
    : null

  const handleStationClick = useCallback(
    (station) => {
      setSelectedRouteStation(station)
      onStationSelect?.(station)
    },
    [onStationSelect]
  )

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
      <div className="relative h-[520px] w-full">
        <APIProvider
          apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
          libraries={['routes']}
        >
          <Map
            defaultCenter={DEFAULT_CENTER}
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
            <CurrentLocationMarker />

            {driverStations.map((station) => (
              <StationGoogleMarker
                key={station.id}
                station={station}
                onClick={handleStationClick}
                isRecommended={recommendedStation?.id === station.id}
              />
            ))}

            <MapCameraController
              recommendedStation={recommendedStation}
            />

            <MapRoute destination={routeDestination} />

            <MapControlsMemo
              showRoute={showRoute}
              onRouteToggle={onRouteToggle}
            />
          </Map>
        </APIProvider>

        <div className="absolute left-4 top-4 z-40 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
            Live Charging Network
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {driverStations.length} stations nearby
          </p>
        </div>

        <div className="absolute bottom-4 left-4 z-40 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Station availability
          </p>

          <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-slate-700">
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
          </div>
        </div>
      </div>
    </div>
  )
}
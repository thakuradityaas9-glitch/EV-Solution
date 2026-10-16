import { memo, useCallback, useEffect } from 'react'
import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps'

const FALLBACK_CENTER = { lat: 28.6139, lng: 77.209 }
const MAP_ZOOM = 13
const ROUTE_ZOOM = 14

const StationGoogleMarker = memo(function StationGoogleMarker({
  station,
  onClick,
  onHover,
  isRecommended,
  isActive,
  isHovered,
  emergencyMode,
}) {
  const availabilityPercentage = station.totalChargers > 0
    ? (station.availableChargers / station.totalChargers) * 100
    : 0

  let markerColor = '#34D399'
  if ((emergencyMode && station.reachable === false) || station.availableChargers === 0) {
    markerColor = '#EF4444'
  } else if (availabilityPercentage <= 35) {
    markerColor = '#FBBF24'
  }

  const handleClick = useCallback(() => onClick(station), [onClick, station])

  return (
    <AdvancedMarker
      position={{ lat: station.latitude, lng: station.longitude }}
      title={station.name}
      onClick={handleClick}
    >
      <div
        className="relative"
        onMouseEnter={() => onHover?.(station.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        {(isRecommended || isActive || isHovered) && (
          <div className={`absolute -inset-2 rounded-full ${isActive ? 'bg-blue-400/35' : 'bg-cyan-400/30'}`} />
        )}
        <div
          className={`relative flex h-11 w-11 items-center justify-center rounded-full border-4 border-white shadow-lg transition ${
            isRecommended || isActive ? 'scale-125' : isHovered ? 'scale-110' : ''
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
          <div className="absolute left-1/2 top-14 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-700 px-3 py-1 text-[11px] font-bold text-white shadow-lg">
            Recommended
          </div>
        )}
      </div>
    </AdvancedMarker>
  )
})

function OriginMarker({ position, label }) {
  if (!position) return null
  return (
    <AdvancedMarker position={position} title={label}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-blue-600 shadow-lg">
        <div className="h-2 w-2 rounded-full bg-white" />
      </div>
    </AdvancedMarker>
  )
}

function RoutePolyline({ path, color }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !path?.length) return

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

    if (routePath?.length) {
      const bounds = new google.maps.LatLngBounds()
      routePath.forEach((point) => bounds.extend(point))
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
    if (map) map.setZoom(Math.min((map.getZoom() ?? MAP_ZOOM) + 1, 20))
  }, [map])
  const zoomOut = useCallback(() => {
    if (map) map.setZoom(Math.max((map.getZoom() ?? MAP_ZOOM) - 1, 3))
  }, [map])
  const resetView = useCallback(() => {
    if (!map) return
    if (routePath?.length) {
      const bounds = new google.maps.LatLngBounds()
      routePath.forEach((point) => bounds.extend(point))
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
    <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
      <button type="button" onClick={zoomIn} aria-label="Zoom in" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl font-bold text-slate-800 shadow-lg">+</button>
      <button type="button" onClick={zoomOut} aria-label="Zoom out" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl font-bold text-slate-800 shadow-lg">−</button>
      <button type="button" onClick={resetView} aria-label="Recenter map" title="Recenter map" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-800 shadow-lg">⌖</button>
    </div>
  )
}

export default function DriverMap({
  stations = [],
  origin,
  originLabel = 'You',
  routePath,
  recommendedStation,
  emergencyMode = false,
  onStationSelect,
  onStationHover,
  activeStationId,
  hoveredStationId,
}) {
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
  const handleStationClick = useCallback(
    (station) => onStationSelect?.(station),
    [onStationSelect]
  )

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-200">
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY} libraries={['routes']}>
        <Map
          defaultCenter={origin || FALLBACK_CENTER}
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
              onHover={onStationHover}
              isRecommended={station.id === recommendedStation?.id}
              isActive={station.id === activeStationId}
              isHovered={station.id === hoveredStationId}
              emergencyMode={emergencyMode}
            />
          ))}
          <MapCameraController origin={origin} recommendedStation={recommendedStation} routePath={routePath} />
          <RoutePolyline path={routePath} color={emergencyMode ? '#dc2626' : '#2563eb'} />
          <MapControls origin={origin} recommendedStation={recommendedStation} routePath={routePath} />
        </Map>
      </APIProvider>
    </div>
  )
}

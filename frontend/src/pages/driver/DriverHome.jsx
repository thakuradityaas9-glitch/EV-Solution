import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import DriverMap from '../../components/driver/DriverMap.jsx'
import DriverHeader from '../../components/driver/DriverHeader.jsx'
import StationCard from '../../components/driver/StationCard.jsx'
import StationDetailsModal from '../../components/driver/StationDetailsModal.jsx'
import { BoltIcon, CloseIcon, CrosshairIcon, ExpandIcon } from '../../components/driver/icons.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDriverVehicles } from '../../context/driverVehicleStore.js'
import { fetchAllStations } from '../../services/stations.js'
import { geocodeAddress, getCurrentLocation, computeRoute } from '../../services/googleRoutes.js'
import { discoverStationsAlongRoute } from '../../services/discovery.js'
import { rankStations } from '../../services/chargerRecommendation.js'

export default function DriverHome() {
  const { profile } = useAuth()
  const { activeVehicle, loading: vehiclesLoading, error: vehicleError } = useDriverVehicles()

  const [fromText, setFromText] = useState('')
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const [originCoords, setOriginCoords] = useState(null)
  const [toText, setToText] = useState('')

  const [chargePercent, setChargePercent] = useState(60)

  const [emergencyActive, setEmergencyActive] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [detailStation, setDetailStation] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [result, setResult] = useState(null) // { route, directRoute, origin, originLabel, destination, destinationLabel, stations }
  const [activeStationId, setActiveStationId] = useState(null) // card <-> marker selection
  const [hoveredStationId, setHoveredStationId] = useState(null)
  const [mapExpanded, setMapExpanded] = useState(false) // mobile only: taller map
  const panelRef = useRef(null)

  const fullChargeRangeKm = activeVehicle
    ? activeVehicle.custom_range_km ?? activeVehicle.vehicle_model?.reference_range_km ?? null
    : null
  const vehicle = activeVehicle
    ? {
        model: [activeVehicle.vehicle_model?.make, activeVehicle.vehicle_model?.model, activeVehicle.vehicle_model?.variant]
          .filter(Boolean)
          .join(' '),
        batteryPercent: chargePercent,
        estimatedRangeKm: fullChargeRangeKm,
        maxChargingKw: activeVehicle.vehicle_model?.max_charging_power_kw ?? null,
        connectorType: activeVehicle.vehicle_model?.connector_type ?? null,
      }
    : null
  const remainingRangeKm = fullChargeRangeKm == null
    ? null
    : Math.round((fullChargeRangeKm * chargePercent) / 100)

  useEffect(() => {
    setChargePercent(activeVehicle?.current_battery_percent ?? 60)
  }, [activeVehicle?.id, activeVehicle?.current_battery_percent])

  async function handleUseCurrentLocation(checked) {
    setUseCurrentLocation(checked)
    if (!checked) {
      setOriginCoords(null)
      return
    }
    try {
      const coords = await getCurrentLocation()
      setOriginCoords(coords)
    } catch (err) {
      setSearchError(err.message)
      setUseCurrentLocation(false)
    }
  }

  async function computeRouteWithOptionalStation(origin, destination, station) {
    const directRoute = await computeRoute(origin, destination)

    if (!station) {
      return { route: directRoute, directRoute }
    }

    try {
      const stationPoint = { lat: station.latitude, lng: station.longitude }
      const firstLeg = await computeRoute(origin, stationPoint)
      const secondLeg = await computeRoute(stationPoint, destination)

      return {
        route: {
          path: [...firstLeg.path, ...secondLeg.path.slice(1)],
          distanceKm: Math.round((firstLeg.distanceKm + secondLeg.distanceKm) * 10) / 10,
          durationMin: firstLeg.durationMin + secondLeg.durationMin,
        },
        directRoute,
      }
    } catch (err) {
      return { route: directRoute, directRoute, stationRouteError: err.message }
    }
  }

  async function buildRankedStationsForRoute(route, emergencyModeOverride = emergencyActive) {
    const allStations = await fetchAllStations({
  lat: route.path?.[0]?.lat,
  lng: route.path?.[0]?.lng,
})
    const routePath = route?.path || []
    const candidates = discoverStationsAlongRoute(routePath, allStations)
    return rankStations(candidates, vehicle, emergencyModeOverride, remainingRangeKm)
  }

  async function runSearch(emergencyMode) {
    if (!useCurrentLocation && !fromText.trim()) {
      setSearchError('Enter a starting point, or use your current location.')
      return
    }
    if (!toText.trim()) {
      setSearchError('Enter a destination to search for chargers.')
      return
    }

    setSearching(true)
    setSearchError(null)

    try {
      const origin = useCurrentLocation
        ? originCoords || (await getCurrentLocation())
        : await geocodeAddress(fromText)
      const destination = await geocodeAddress(toText)

      const { route, directRoute, stationRouteError } = await computeRouteWithOptionalStation(
        origin,
        destination,
        selectedStation
      )

      const ranked = await buildRankedStationsForRoute(route, emergencyMode)

      setResult({
        route,
        directRoute,
        origin,
        originLabel: useCurrentLocation ? 'Current Location' : fromText,
        destination,
        destinationLabel: toText,
        stations: ranked,
      })

      if (stationRouteError) {
        setSearchError(`Could not route through selected station. Showing direct route.`)
      }

      setEmergencyActive(emergencyMode)
    } catch (err) {
      setSearchError(err.message || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  function handleToggleEmergency() {
    const next = !emergencyActive
    if (result) {
      runSearch(next)
    } else {
      setEmergencyActive(next)
    }
  }

  function handleUseStation(station) {
    setSelectedStation(station)
    setDetailStation(null)
    if (!result?.origin || !result?.destination) return

    setSearching(true)
    setSearchError(null)
    computeRouteWithOptionalStation(result.origin, result.destination, station)
      .then(async ({ route, directRoute, stationRouteError }) => {
        const ranked = await buildRankedStationsForRoute(route, emergencyActive)
        setResult((current) => ({
          ...current,
          route,
          directRoute,
          stationRouteError,
          stations: ranked,
        }))
        if (stationRouteError) {
          setSearchError('Could not route through selected station. Showing direct route.')
        }
      })
      .catch((err) => {
        setSearchError(err.message || 'Could not route through selected station.')
      })
      .finally(() => setSearching(false))
  }

  function handleRemoveStation() {
    setSelectedStation(null)
    setSearchError(null)
    setResult((current) => {
      if (!current) return current
      const nextRoute = current.directRoute || current.route
      return {
        ...current,
        route: nextRoute,
      }
    })

    if (result?.directRoute) {
      const directRoute = result.directRoute
      buildRankedStationsForRoute(directRoute, emergencyActive)
        .then((ranked) => {
          setResult((current) => {
            if (!current) return current
            return {
              ...current,
              route: current.directRoute || current.route,
              stations: ranked,
            }
          })
        })
        .catch(() => {
          setSearchError('Could not refresh station list for the direct route.')
        })
    }
  }

  const reachableStations = result?.stations?.filter((station) => station.reachable) || []
  const topStation = reachableStations[0] || null
  const restStations = result?.stations?.filter((station) => station.id !== topStation?.id) || []
  const hasReachableStations = reachableStations.length > 0

  // Ignore a stale selection once a new search no longer contains that station.
  const activeId = result?.stations?.some((station) => station.id === activeStationId)
    ? activeStationId
    : null

  const handleSelectStation = useCallback((station) => {
    setActiveStationId(station?.id ?? null)
  }, [])

  // When a marker is picked, bring its card into view inside the results column.
  useEffect(() => {
    if (activeId == null) return
    const panel = panelRef.current
    const card = document.getElementById(`station-card-${activeId}`)
    if (!panel || !card) return
    const panelBox = panel.getBoundingClientRect()
    const cardBox = card.getBoundingClientRect()
    if (cardBox.top < panelBox.top + 8) {
      panel.scrollBy({ top: cardBox.top - panelBox.top - 12, behavior: 'smooth' })
    } else if (cardBox.bottom > panelBox.bottom - 8) {
      panel.scrollBy({ top: cardBox.bottom - panelBox.bottom + 12, behavior: 'smooth' })
    }
  }, [activeId])

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  const stationList = topStation ? [topStation, ...restStations] : []
  const routeSummary = result?.route
    ? [
        result.route.distanceKm != null ? `${result.route.distanceKm} km` : null,
        result.route.durationMin != null ? `${Math.round(result.route.durationMin)} min` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <main className="relative flex h-full min-h-0 flex-col bg-slate-100 text-slate-900 lg:grid lg:grid-cols-[minmax(380px,440px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
      {/* Map: pinned above the list on mobile, a full-height column on desktop. */}
      <div
        className={`relative order-1 shrink-0 transition-[height] duration-300 lg:order-2 lg:h-auto ${
          mapExpanded ? 'h-[62dvh]' : 'h-[34dvh]'
        }`}
      >
        <DriverMap
          stations={result?.stations || []}
          origin={result?.origin || originCoords}
          originLabel={result?.originLabel || 'You'}
          routePath={result?.route?.path}
          recommendedStation={selectedStation || topStation}
          emergencyMode={emergencyActive}
          onStationSelect={handleSelectStation}
          onStationHover={setHoveredStationId}
          activeStationId={activeId}
          hoveredStationId={hoveredStationId}
        />
        <button
          type="button"
          onClick={() => setMapExpanded((v) => !v)}
          aria-label={mapExpanded ? 'Shrink map' : 'Enlarge map'}
          className="absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-md transition hover:bg-slate-50 lg:hidden"
        >
          <ExpandIcon collapsed={mapExpanded} />
          {mapExpanded ? 'Show results' : 'Enlarge map'}
        </button>
      </div>

      {/* Results column: scrolls on its own, so the map never leaves the screen. */}
      <section
        ref={panelRef}
        className="relative order-2 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white shadow-[0_-4px_16px_rgba(15,23,42,0.08)] lg:order-1 lg:z-10 lg:shadow-[4px_0_16px_rgba(15,23,42,0.06)]"
      >
        {searching && <div className="sticky top-0 z-20 h-0.5 animate-pulse bg-blue-600" />}

        <div className="space-y-4 px-4 pb-4 pt-4">
          <DriverHeader profile={profile} emergencyActive={emergencyActive} onToggleEmergency={handleToggleEmergency} />

          {emergencyActive && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
              Emergency mode is on: chargers are ranked by how quickly you can reach them.
            </p>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault()
              runSearch(emergencyActive)
            }}
            className="space-y-4"
          >
            <div className="flex gap-3">
              <div className="flex flex-col items-center py-3.5" aria-hidden="true">
                <span className="h-3 w-3 rounded-full border-[3px] border-blue-600 bg-white" />
                <span className="my-1 w-0 flex-1 border-l-2 border-dotted border-slate-300" />
                <span className="h-3 w-3 rounded-full bg-red-500" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {useCurrentLocation ? (
                  <div className="flex min-h-11 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                    {originCoords
                      ? `Your location (${originCoords.lat.toFixed(4)}, ${originCoords.lng.toFixed(4)})`
                      : 'Waiting for location access…'}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={fromText}
                    onChange={(e) => setFromText(e.target.value)}
                    placeholder="Choose starting point"
                    aria-label="Starting point"
                    className={inputClass}
                  />
                )}
                <input
                  type="text"
                  value={toText}
                  onChange={(e) => setToText(e.target.value)}
                  placeholder="Choose destination"
                  aria-label="Destination"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="button"
              aria-pressed={useCurrentLocation}
              onClick={() => handleUseCurrentLocation(!useCurrentLocation)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                useCurrentLocation
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CrosshairIcon className="h-3.5 w-3.5" />
              Use current location
            </button>

            <div className="rounded-xl border border-slate-200 p-3">
              {vehicle ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-slate-500">Active vehicle</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                        {activeVehicle.nickname || vehicle.model || 'Saved vehicle'}
                      </p>
                      {activeVehicle.nickname && <p className="truncate text-xs text-slate-500">{vehicle.model}</p>}
                    </div>
                    <Link to="/driver/vehicles" className="shrink-0 text-xs font-semibold text-blue-700 hover:underline">Manage</Link>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{chargePercent}% battery for this search</span>
                    <span className="text-xs text-slate-500">
                      {remainingRangeKm == null ? 'Range unavailable' : `≈ ${remainingRangeKm} km remaining`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={chargePercent}
                    onChange={(event) => setChargePercent(Number(event.target.value))}
                    className="mt-2 h-2 w-full accent-blue-600"
                    aria-label="Battery percentage for this search"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Full-charge range: {fullChargeRangeKm == null ? 'not listed' : `${fullChargeRangeKm} km`}. Trip estimate only; the saved battery level is unchanged.
                  </p>
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">No active vehicle</p>
                    <p className="mt-1 text-xs text-slate-500">Add one to include battery range in charger recommendations.</p>
                  </div>
                  <Link to="/driver/vehicles" className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">Manage vehicles</Link>
                </div>
              )}
            </div>

            {vehicleError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Vehicle data could not be loaded: {vehicleError}
              </p>
            )}

            <button
              type="submit"
              disabled={searching || vehiclesLoading}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? 'Finding chargers…' : vehiclesLoading ? 'Loading…' : 'Find chargers'}
            </button>

            {selectedStation && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                <span className="min-w-0 truncate">
                  Routing via <span className="font-semibold">{selectedStation.name}</span>
                </span>
                <button
                  type="button"
                  onClick={handleRemoveStation}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 bg-white px-2.5 py-1 font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <CloseIcon className="h-3 w-3" />
                  Remove
                </button>
              </div>
            )}

            {searchError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {searchError}
              </p>
            )}
          </form>
        </div>

        {!result && !searching && (
          <div className="border-t border-slate-100 px-6 py-10 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <BoltIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">Find chargers on your route</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Enter a start and destination to see suitable chargers along the way.
            </p>
          </div>
        )}

        {result && (
          <div className="border-t border-slate-100 bg-slate-50 px-4 pb-6 pt-4">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {stationList.length} charger{stationList.length === 1 ? '' : 's'} along your route
              </h2>
              {routeSummary && <span className="text-xs font-medium text-slate-500">{routeSummary}</span>}
            </div>

            {!hasReachableStations && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <p className="text-sm font-semibold">No reachable charging stations</p>
                <p className="mt-1 text-xs leading-5">
                  No charging station in the current search area can be safely reached with your current battery.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {stationList.map((station, index) => (
                <StationCard
                  key={station.id}
                  station={station}
                  rank={index + 1}
                  highlighted={index === 0}
                  active={activeId === station.id}
                  hovered={hoveredStationId === station.id}
                  routedVia={selectedStation?.id === station.id}
                  emergencyMode={emergencyActive}
                  onSelect={handleSelectStation}
                  onHover={setHoveredStationId}
                  onViewDetails={setDetailStation}
                  onUseStation={handleUseStation}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {detailStation && (
        <StationDetailsModal
          station={detailStation}
          selectedStation={selectedStation}
          onUseStation={handleUseStation}
          onClose={() => setDetailStation(null)}
        />
      )}
    </main>
  )
}

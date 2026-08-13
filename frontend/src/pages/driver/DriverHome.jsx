import { useEffect, useState } from 'react'
import DriverMap from '../../components/driver/DriverMap.jsx'
import DriverHeader from '../../components/driver/DriverHeader.jsx'
import StationCard from '../../components/driver/StationCard.jsx'
import StationDetailsModal from '../../components/driver/StationDetailsModal.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchStations, fetchVehicle } from '../../services/stations.js'
import { geocodeAddress, getCurrentLocation, computeRoute } from '../../services/googleRoutes.js'
import { discoverStationsAlongRoute } from '../../services/discovery.js'
import { rankStations } from '../../services/chargerRecommendation.js'
import { VEHICLE_OPTIONS, DEFAULT_SELECTED_VEHICLE_MODEL } from '../../data/vehicles.js'

const DEFAULT_VEHICLE = {
  model: DEFAULT_SELECTED_VEHICLE_MODEL,
  batteryPercent: 60,
  estimatedRangeKm: 465,
  maxChargingKw: 50,
  connectorType: 'CCS2',
}

export default function DriverHome() {
  const { user, profile } = useAuth()

  const [fromText, setFromText] = useState('')
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const [originCoords, setOriginCoords] = useState(null)
  const [toText, setToText] = useState('')

  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE)
  const [vehicleLoaded, setVehicleLoaded] = useState(false)
  const [chargePercent, setChargePercent] = useState(DEFAULT_VEHICLE.batteryPercent)

  const [emergencyActive, setEmergencyActive] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [detailStation, setDetailStation] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [result, setResult] = useState(null) // { route, directRoute, origin, originLabel, destination, destinationLabel, stations }

  const selectedVehicleConfig =
    VEHICLE_OPTIONS.find((option) => option.model === vehicle.model) || VEHICLE_OPTIONS[0]

  const remainingRangeKm = Math.round(
    ((selectedVehicleConfig?.rangeKm ?? vehicle.estimatedRangeKm ?? 0) * chargePercent) / 100
  )

  // Load the driver's saved vehicle on mount, if they have one.
  useEffect(() => {
    let mounted = true
    if (!user?.id) {
      setVehicleLoaded(true) // nothing to load — don't leave the UI stuck disabled
      return
    }
    fetchVehicle(user.id)
      .then((v) => {
        if (mounted && v) {
          setVehicle(v)
          setChargePercent(v.batteryPercent ?? DEFAULT_VEHICLE.batteryPercent)
        }
        if (mounted) setVehicleLoaded(true)
      })
      .catch(() => mounted && setVehicleLoaded(true))
    return () => {
      mounted = false
    }
  }, [user?.id])

  useEffect(() => {
    setVehicle((current) => {
      if (!current || !current.model) return current
      const matchingVehicle = VEHICLE_OPTIONS.find((option) => option.model === current.model)
      if (!matchingVehicle) return current
      return {
        ...current,
        estimatedRangeKm: matchingVehicle.rangeKm,
      }
    })
  }, [vehicle.model])

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
    const allStations = await fetchStations()
    const routePath = route?.path || []
    const candidates = discoverStationsAlongRoute(routePath, allStations)
    return rankStations(candidates, {
      ...vehicle,
      batteryPercent: chargePercent,
      estimatedRangeKm: selectedVehicleConfig?.rangeKm ?? vehicle.estimatedRangeKm ?? 0,
    }, emergencyModeOverride, remainingRangeKm)
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

  const handleVehicleChange = (event) => {
    const selectedModel = event.target.value
    const selectedVehicle = VEHICLE_OPTIONS.find((option) => option.model === selectedModel)

    setVehicle((current) => ({
      ...current,
      model: selectedModel,
      estimatedRangeKm: selectedVehicle?.rangeKm ?? current.estimatedRangeKm,
    }))
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <DriverHeader profile={profile} emergencyActive={emergencyActive} onToggleEmergency={handleToggleEmergency} />

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Route search</p>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-950">From your vehicle to the best charger.</h2>
                  <p className="mt-3 max-w-2xl text-sm text-slate-600">
                    Use your current location and destination to preview chargers along your route.
                  </p>
                </div>
                <div className={`rounded-[28px] border px-5 py-4 shadow-sm transition ${emergencyActive ? 'border-red-300 bg-red-600 text-white shadow-red-300/20' : 'border-red-100 bg-red-50 text-slate-950'}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em]">Emergency mode</p>
                  <p className="mt-3 text-base font-semibold">
                    {emergencyActive
                      ? 'Active — prioritizing reachable chargers and faster safe routing.'
                      : 'Activate for the fastest route to a suitable charger.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleToggleEmergency}
                    className={`mt-5 w-full rounded-3xl px-5 py-3 text-sm font-semibold transition ${emergencyActive ? 'bg-white text-red-700 hover:bg-slate-100' : 'bg-red-700 text-white hover:bg-red-800'}`}
                  >
                    {emergencyActive ? 'Deactivate Emergency' : 'Activate Emergency'}
                  </button>
                </div>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Vehicle</p>
                  <label className="mt-4 block">
                    <span className="sr-only">Select EV</span>
                    <select
                      value={vehicle.model}
                      onChange={handleVehicleChange}
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                    >
                      {VEHICLE_OPTIONS.map((option) => (
                        <option key={option.model} value={option.model}>
                          {option.model}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Estimated remaining range</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{remainingRangeKm} km</p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Current charge</p>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <span className="text-2xl font-semibold text-slate-950">{chargePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={chargePercent}
                    onChange={(event) => setChargePercent(Number(event.target.value))}
                    className="mt-5 h-2 w-full accent-cyan-600"
                    aria-label="Current charge percentage"
                  />
                </div>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">From</p>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-cyan-700">
                      <input
                        type="checkbox"
                        checked={useCurrentLocation}
                        onChange={(e) => handleUseCurrentLocation(e.target.checked)}
                        className="h-4 w-4 accent-cyan-600"
                      />
                      Use current location
                    </label>
                  </div>
                  <div className="mt-5 rounded-3xl bg-white p-4 text-sm text-slate-900 shadow-sm">
                    <p className="font-semibold text-slate-950">📍 Current Location</p>
                    {originCoords ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {originCoords.lat.toFixed(4)}, {originCoords.lng.toFixed(4)}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">
                        {useCurrentLocation ? 'Waiting for location access…' : 'Your device location will populate here.'}
                      </p>
                    )}
                  </div>
                  {!useCurrentLocation && (
                    <input
                      type="text"
                      value={fromText}
                      onChange={(e) => setFromText(e.target.value)}
                      placeholder="Enter starting point"
                      className="mt-4 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                    />
                  )}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">To</p>
                  <input
                    type="text"
                    value={toText}
                    onChange={(e) => setToText(e.target.value)}
                    placeholder="Enter destination"
                    className="mt-4 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => runSearch(emergencyActive)}
                  disabled={searching || !vehicleLoaded}
                  className="inline-flex min-h-[3rem] items-center justify-center rounded-3xl bg-cyan-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {searching ? 'Finding chargers…' : !vehicleLoaded ? 'Loading…' : 'Find Chargers'}
                </button>
                {selectedStation && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span>Charger selected: {selectedStation.name}</span>
                    <button
                      type="button"
                      onClick={handleRemoveStation}
                      className="rounded-3xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-100"
                    >
                      Remove Charger
                    </button>
                  </div>
                )}
                {searchError && (
                  <p className="rounded-3xl bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                    {searchError}
                  </p>
                )}
              </div>
            </div>

            {result && !hasReachableStations && (
              <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">No Reachable Charging Stations</p>
                <p className="mt-3 text-sm leading-6 text-amber-900">
                  No charging station in the current search area can be safely reached with your current battery.
                </p>
                
              </div>
            )}

            {topStation && (
              <div className="space-y-5">
                <div className="rounded-[28px] border-2 border-cyan-400 bg-cyan-50/60 p-6 shadow-lg shadow-cyan-300/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                    {emergencyActive ? 'Safest reachable charger' : 'Best match'}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-semibold">Why this station? </span>
                    {topStation.reason}
                  </p>
                </div>
                <StationCard
                  station={topStation}
                  highlighted
                  emergencyMode={emergencyActive}
                  onViewDetails={setDetailStation}
                />
                {restStations.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    emergencyMode={emergencyActive}
                    onViewDetails={setDetailStation}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <DriverMap
              stations={result?.stations || []}
              origin={result?.origin || originCoords}
              originLabel={result?.originLabel || 'You'}
              routePath={result?.route?.path}
              recommendedStation={selectedStation || topStation}
              emergencyMode={emergencyActive}
              onStationSelect={setDetailStation}
            />
          </div>
        </section>
      </div>

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

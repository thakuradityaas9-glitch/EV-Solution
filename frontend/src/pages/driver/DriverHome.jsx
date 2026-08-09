import { useEffect, useState } from 'react'
import BatteryIndicator from '../../components/driver/BatteryIndicator.jsx'
import DriverMap from '../../components/driver/DriverMap.jsx'
import DriverHeader from '../../components/driver/DriverHeader.jsx'
import StationCard from '../../components/driver/StationCard.jsx'
import StationDetailsModal from '../../components/driver/StationDetailsModal.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchStations, fetchVehicle, upsertVehicle } from '../../services/stations.js'
import { geocodeAddress, getCurrentLocation, computeRoute } from '../../services/googleRoutes.js'
import { discoverStationsAlongRoute } from '../../services/discovery.js'
import { rankStations } from '../../services/chargerRecommendation.js'
import { haversineKm } from '../../lib/geo.js'

const DEFAULT_VEHICLE = {
  model: 'My EV',
  batteryPercent: 80,
  estimatedRangeKm: 250,
  maxChargingKw: 50,
  connectorType: 'CCS2',
}

export default function DriverHome() {
  const { user } = useAuth()

  const [fromText, setFromText] = useState('')
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const [originCoords, setOriginCoords] = useState(null)
  const [toText, setToText] = useState('')

  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE)
  const [vehicleLoaded, setVehicleLoaded] = useState(false)
  const [vehicleEditorOpen, setVehicleEditorOpen] = useState(false)
  const [savingVehicle, setSavingVehicle] = useState(false)

  const [emergencyActive, setEmergencyActive] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [result, setResult] = useState(null) // { route, origin, originLabel, stations }

  // Load the driver's saved vehicle on mount, if they have one.
  useEffect(() => {
    let mounted = true
    if (!user?.id) {
      setVehicleLoaded(true) // nothing to load — don't leave the UI stuck disabled
      return
    }
    fetchVehicle(user.id)
      .then((v) => {
        if (mounted && v) setVehicle(v)
        if (mounted) setVehicleLoaded(true)
        if (mounted && !v) setVehicleEditorOpen(true) // prompt setup if nothing saved yet
      })
      .catch(() => mounted && setVehicleLoaded(true))
    return () => {
      mounted = false
    }
  }, [user?.id])

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

  async function handleSaveVehicle() {
    if (!user?.id) return
    setSavingVehicle(true)
    try {
      const saved = await upsertVehicle(user.id, vehicle)
      setVehicle(saved)
    } catch (err) {
      setSearchError(err.message)
    } finally {
      setSavingVehicle(false)
    }
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

      const route = await computeRoute(origin, destination)
      const allStations = await fetchStations()
      const candidates = discoverStationsAlongRoute(route.path, allStations)
      const ranked = rankStations(candidates, vehicle, emergencyMode)

      setResult({
        route,
        origin,
        originLabel: useCurrentLocation ? 'Current Location' : fromText,
        stations: ranked,
      })
      setSelectedStation(ranked[0] || null)
      setEmergencyActive(emergencyMode)
    } catch (err) {
      setSearchError(err.message || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function handleNearbyChargers() {
    setSearching(true)
    setSearchError(null)
    try {
      const origin = useCurrentLocation
        ? originCoords || (await getCurrentLocation())
        : fromText.trim()
          ? await geocodeAddress(fromText)
          : await getCurrentLocation()

      const allStations = await fetchStations()
      // No real route to filter against — rank by straight-line
      // distance from origin instead, using the same engine (a
      // "route" of a single point makes distanceKm == straight-line
      // distance and routeProgressKm == 0, so journeyDelayMin still
      // means something sensible: pure detour, no route to be near).
      const candidates = allStations
        .map((s) => ({
          ...s,
          distanceKm:
            Math.round(haversineKm(origin, { lat: s.latitude, lng: s.longitude }) * 10) / 10,
          routeProgressKm: 0,
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 20)

      const ranked = rankStations(candidates, vehicle, false)

      setResult({ route: null, origin, originLabel: 'Current Location', stations: ranked })
      setSelectedStation(ranked[0] || null)
      setEmergencyActive(false)
    } catch (err) {
      setSearchError(err.message || 'Could not find nearby chargers')
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

  const topStation = result?.stations?.[0] || null
  const restStations = result?.stations?.slice(1) || []

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <DriverHeader emergencyActive={emergencyActive} onToggleEmergency={handleToggleEmergency} />

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            {/* Trip planner */}
            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                    Where are you going?
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                    Start your trip and find the best charger.
                  </h2>
                </div>
                <div
                  className={`rounded-3xl px-4 py-2 text-sm font-semibold ${
                    emergencyActive
                      ? 'border border-red-200 bg-red-50 text-red-700'
                      : 'border border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {emergencyActive ? 'Emergency routing enabled' : 'Standard route planning'}
                </div>
              </div>

              <div className="mt-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-600">From</label>
                      <label className="flex items-center gap-2 text-xs font-medium text-cyan-700">
                        <input
                          type="checkbox"
                          checked={useCurrentLocation}
                          onChange={(e) => handleUseCurrentLocation(e.target.checked)}
                          className="h-3.5 w-3.5 accent-cyan-600"
                        />
                        Use current location
                      </label>
                    </div>
                    {useCurrentLocation ? (
                      <p className="mt-3 text-lg font-semibold text-slate-950">
                        📍 Current Location
                        {originCoords && (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            ({originCoords.lat.toFixed(3)}, {originCoords.lng.toFixed(3)})
                          </span>
                        )}
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={fromText}
                        onChange={(e) => setFromText(e.target.value)}
                        placeholder="Enter starting point"
                        className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                      />
                    )}
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <label className="text-sm font-medium text-slate-600">To</label>
                    <input
                      type="text"
                      value={toText}
                      onChange={(e) => setToText(e.target.value)}
                      placeholder="Enter destination"
                      className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
                  <div className="space-y-3">
                    <BatteryIndicator value={vehicle.batteryPercent} />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={vehicle.batteryPercent}
                      onChange={(e) =>
                        setVehicle((v) => ({ ...v, batteryPercent: Number(e.target.value) }))
                      }
                      className="w-full accent-cyan-600"
                    />
                    <button
                      type="button"
                      onClick={() => setVehicleEditorOpen((v) => !v)}
                      className="text-xs font-semibold text-cyan-700"
                    >
                      {vehicleEditorOpen ? 'Hide vehicle details ▴' : 'Edit vehicle details ▾'}
                    </button>
                    {vehicleEditorOpen && (
                      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <input
                          type="text"
                          value={vehicle.model}
                          onChange={(e) => setVehicle((v) => ({ ...v, model: e.target.value }))}
                          placeholder="Model"
                          className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                        <input
                          type="number"
                          value={vehicle.estimatedRangeKm}
                          onChange={(e) =>
                            setVehicle((v) => ({ ...v, estimatedRangeKm: Number(e.target.value) }))
                          }
                          placeholder="Range (km)"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                        <input
                          type="number"
                          value={vehicle.maxChargingKw}
                          onChange={(e) =>
                            setVehicle((v) => ({ ...v, maxChargingKw: Number(e.target.value) }))
                          }
                          placeholder="Max kW"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                        <select
                          value={vehicle.connectorType}
                          onChange={(e) =>
                            setVehicle((v) => ({ ...v, connectorType: e.target.value }))
                          }
                          className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        >
                          <option>CCS2</option>
                          <option>CHAdeMO</option>
                          <option>Type 2</option>
                          <option>GB/T</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleSaveVehicle}
                          disabled={savingVehicle || !user?.id}
                          className="col-span-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {savingVehicle ? 'Saving…' : 'Save vehicle'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-600">Trip action</p>
                    <p className="mt-3 text-lg font-semibold text-slate-950">
                      Find the best charger for your route
                    </p>
                    <button
                      type="button"
                      onClick={() => runSearch(emergencyActive)}
                      disabled={searching || !vehicleLoaded}
                      className="mt-6 inline-flex w-full items-center justify-center rounded-3xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
                    >
                      {searching
                        ? 'Searching…'
                        : !vehicleLoaded
                          ? 'Loading your vehicle…'
                          : 'Find Best Charger'}
                    </button>
                    <button
                      type="button"
                      onClick={handleNearbyChargers}
                      disabled={searching || !vehicleLoaded}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Nearby Chargers (no destination)
                    </button>
                  </div>
                </div>

                {searchError && (
                  <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {searchError}
                  </p>
                )}
              </div>
            </div>

            {/* Results */}
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
                  onViewDetails={setSelectedStation}
                />
                {restStations.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    emergencyMode={emergencyActive}
                    onViewDetails={setSelectedStation}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                Map preview
              </p>
              <p className="mt-3 text-base text-slate-600">
                {result
                  ? `${result.route ? `${result.route.distanceKm} km · ~${result.route.durationMin} min · ` : ''}${result.stations.length} stations found`
                  : 'Search a route to see live charging stations along the way.'}
              </p>
            </div>
            <DriverMap
              stations={result?.stations || []}
              origin={result?.origin || originCoords}
              originLabel={result?.originLabel || 'You'}
              routePath={result?.route?.path}
              recommendedStation={topStation}
              emergencyMode={emergencyActive}
              onStationSelect={setSelectedStation}
            />
          </div>
        </section>
      </div>

      {selectedStation && (
        <StationDetailsModal station={selectedStation} onClose={() => setSelectedStation(null)} />
      )}
    </main>
  )
}

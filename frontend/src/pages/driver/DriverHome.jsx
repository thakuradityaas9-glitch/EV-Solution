import { useState } from 'react'
import BatteryIndicator from '../../components/driver/BatteryIndicator.jsx'
import DriverMap from '../../components/driver/DriverMap.jsx'
import DriverHeader from '../../components/driver/DriverHeader.jsx'
import StationDetailsModal from '../../components/driver/StationDetailsModal.jsx'
import { driverStations } from '../../data/driverStations.js'

export default function DriverHome() {
  const [emergencyActive, setEmergencyActive] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [showRoute, setShowRoute] = useState(false)
  const [destination, setDestination] = useState('')

  const currentStation = driverStations[0]

  const findBestCharger = () => {
    if (!destination.trim()) {
      return
    }

    const availableStations = driverStations.filter(
      (station) => station.reachable && station.availableChargers > 0
    )

    if (availableStations.length === 0) {
      return
    }

    const bestStation = [...availableStations].sort(
      (a, b) => b.recommendationScore - a.recommendationScore
    )[0]

    setSelectedStation(bestStation)
    setShowRoute(true)
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <DriverHeader emergencyActive={emergencyActive} onToggleEmergency={() => setEmergencyActive(active => !active)} />

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Where are you going?</p>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-950">Start your trip and find the best charger.</h2>
                </div>
                <div className={`rounded-3xl px-4 py-2 text-sm font-semibold ${emergencyActive ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                  {emergencyActive ? 'Emergency routing enabled' : 'Standard route planning'}
                </div>
              </div>

              <div className="mt-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <label className="text-sm font-medium text-slate-600">From</label>
                    <p className="mt-3 text-lg font-semibold text-slate-950">Current Location</p>
                    <p className="mt-2 text-sm text-slate-600">Riverfront Ave, City Center</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <label className="text-sm font-medium text-slate-600">To</label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      placeholder="Enter destination"
                      className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
                  <BatteryIndicator value={64} />
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-600">Trip action</p>
                    <p className="mt-3 text-lg font-semibold text-slate-950">Find the best charger for your route</p>
                    <button className="mt-6 inline-flex w-full items-center justify-center rounded-3xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800"
                    type='button' onClick={findBestCharger}>
                      Find Best Charger
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
                <p className="text-sm font-semibold text-slate-500">Quick access</p>
                <div className="mt-5 space-y-4">
                  <button className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-100">
                    Nearby Chargers
                  </button>
                  <button className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-100">
                    Emergency Mode
                  </button>
                </div>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
                <p className="text-sm font-semibold text-slate-500">Live summary</p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Next charger</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{currentStation.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{currentStation.distanceKm} km away · {currentStation.waitMin} min wait</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Best fit</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{currentStation.type}</p>
                    <p className="mt-1 text-sm text-slate-600">{currentStation.availableChargers}/{currentStation.totalChargers} chargers available</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Map preview</p>
              <p className="mt-3 text-base text-slate-600">Explore nearby charging stations and find the best option for your route.</p>
            </div>
            <DriverMap onStationSelect={(station) => {
              setSelectedStation(station)
              setShowRoute(false)
            }} 
            showRoute={showRoute} 
            onRouteToggle={() => setShowRoute((current) => !current)}/>
          </div>
        </section>
      </div>

      {selectedStation && (
        <StationDetailsModal
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </main>
  )
}

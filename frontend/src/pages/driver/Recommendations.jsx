import { useMemo, useState } from 'react'
import DriverMapPlaceholder from '../../components/driver/DriverMapPlaceholder.jsx'
import StationCard from '../../components/driver/StationCard.jsx'
import StationDetailsModal from '../../components/driver/StationDetailsModal.jsx'
import EmergencyModeToggle from '../../components/driver/EmergencyModeToggle.jsx'
import { driverStations } from '../../data/driverStations.js'

const mapMarkers = [
  { id: 'charger-1', cx: 190, cy: 300, color: '#34D399', stroke: '#86EFAC' },
  { id: 'charger-2', cx: 300, cy: 230, color: '#38BDF8', stroke: '#7DD3FC' },
  { id: 'charger-3', cx: 520, cy: 160, color: '#f97316', stroke: '#fcd34d' },
]

export default function Recommendations() {
  const [selectedStation, setSelectedStation] = useState(null)
  const [emergencyMode, setEmergencyMode] = useState(false)

  const recommendedStations = useMemo(() => {
    if (emergencyMode) {
      return [...driverStations].sort((a, b) => {
        const scoreA = (a.reachable ? 100 : 0) - a.etaMin * 1.5 - a.waitMin * 1.3 + a.availableChargers * 4
        const scoreB = (b.reachable ? 100 : 0) - b.etaMin * 1.5 - b.waitMin * 1.3 + b.availableChargers * 4
        return scoreB - scoreA
      })
    }
    return [...driverStations].sort((a, b) => b.recommendationScore - a.recommendationScore)
  }, [emergencyMode])

  const topStation = recommendedStations[0]

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="flex flex-col gap-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Best charging options for your route</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Recommended stations</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Choose from the best options based on reachability, wait time, and charging availability.
            </p>
          </div>
          <EmergencyModeToggle active={emergencyMode} onToggle={() => setEmergencyMode(active => !active)} />
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Destination</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">City Airport</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Battery</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">64%</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Stations evaluated</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{driverStations.length}</p>
                </div>
              </div>
              <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                {emergencyMode ? 'Emergency Mode prioritizes the fastest reachable charger.' : 'Recommendations balance route fit, wait time, and charger availability.'}
              </div>
            </div>

            <div className="space-y-5">
              {recommendedStations.map((station, index) => (
                <StationCard
                  key={station.id}
                  station={station}
                  highlighted={index === 0}
                  emergencyMode={emergencyMode}
                  onViewDetails={setSelectedStation}
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Top recommendation</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-lg font-semibold text-slate-950">Why this station?</p>
                  <ul className="mt-4 space-y-3 text-slate-700">
                    <li>✓ Low waiting time</li>
                    <li>✓ Small route deviation</li>
                    <li>✓ High-speed charging</li>
                    <li>✓ {topStation.availableChargers} chargers currently available</li>
                  </ul>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Station snapshot</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/30">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">ETA</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">{topStation.etaMin} min</p>
                    </div>
                    <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/30">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Battery safe arrival</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">64%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DriverMapPlaceholder markers={mapMarkers} />
          </div>
        </div>
      </div>

      <StationDetailsModal station={selectedStation} onClose={() => setSelectedStation(null)} />
    </main>
  )
}

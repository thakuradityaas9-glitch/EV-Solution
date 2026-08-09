import { useEffect, useMemo, useState } from 'react'
import { fetchStations } from '../../services/stations.js'

function formatNumber(value) {
  return value.toLocaleString('en-US')
}

function statusBadge(label, tone) {
  const classes = {
    positive: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    negative: 'bg-rose-100 text-rose-700',
    neutral: 'bg-slate-100 text-slate-700',
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes[tone] || classes.neutral}`}>
      {label}
    </span>
  )
}

function getStationStatus(station) {
  if (station.liveAvailableChargers == null) return { label: 'Offline', tone: 'negative' }
  if (station.liveAvailableChargers === 0) return { label: 'Occupied', tone: 'warning' }
  return { label: 'Available', tone: 'positive' }
}

export default function LiveOperations() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [selectedStation, setSelectedStation] = useState(null)

  const loadStations = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const data = await fetchStations()
      setStations(data)
    } catch (err) {
      setError(err?.message || 'Unable to load charging station data.')
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    let mounted = true
    if (mounted) loadStations()
    return () => {
      mounted = false
    }
  }, [])

  const stationTelemetry = useMemo(() => stations.filter((station) => station.liveAvailableChargers != null), [stations])
  const totalStations = stations.length
  const availableChargers = stationTelemetry.reduce(
    (sum, station) => sum + Math.max(0, station.liveAvailableChargers),
    0,
  )
  const occupiedChargers = stationTelemetry.reduce(
    (sum, station) => sum + Math.max(0, station.totalChargers - station.liveAvailableChargers),
    0,
  )
  const unavailableChargers = stations.reduce(
    (sum, station) => sum + (station.liveAvailableChargers == null ? station.totalChargers : 0),
    0,
  )

  const networkStatus = stationTelemetry.length > 0 ? 'Network Online' : 'Monitoring'
  const networkStatusTone = stationTelemetry.length > 0 ? 'positive' : 'neutral'

  const filteredStations = useMemo(() => stations, [stations])

  return (
    <section className="min-h-screen bg-slate-950 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Operator Portal</p>
              <h1 className="mt-2 text-4xl font-semibold text-slate-950">Live Operations</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Monitor charging activity across your network.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {networkStatus}
              </div>
              <button
                type="button"
                onClick={() => loadStations(true)}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-700">
                Total stations
                <p className="mt-2 text-3xl font-semibold text-slate-950">{loading ? '—' : formatNumber(totalStations)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-700">
                Available chargers
                <p className="mt-2 text-3xl font-semibold text-slate-950">{loading ? '—' : formatNumber(availableChargers)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-700">
                Occupied chargers
                <p className="mt-2 text-3xl font-semibold text-slate-950">{loading ? '—' : formatNumber(occupiedChargers)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-700">
                Offline / unavailable
                <p className="mt-2 text-3xl font-semibold text-slate-950">{loading ? '—' : formatNumber(unavailableChargers)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Live occupancy</p>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Live occupancy data will appear here when the camera service is connected.
              </p>
            </div>
            <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">System summary</p>
              <div className="mt-6 grid gap-4 text-sm text-slate-600">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="font-semibold text-slate-950">Stations reporting telemetry</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatNumber(stationTelemetry.length)}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="font-semibold text-slate-950">Stations without telemetry</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatNumber(totalStations - stationTelemetry.length)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-52 rounded-4xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
                <div className="h-6 w-44 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-6 grid gap-4">
                  <div className="h-14 rounded-3xl bg-slate-100" />
                  <div className="h-14 rounded-3xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-4xl border border-rose-200 bg-rose-50 p-8 text-slate-950 shadow-sm shadow-rose-200/40">
            <h2 className="text-2xl font-semibold text-rose-800">Live operations unavailable</h2>
            <p className="mt-3 text-slate-700">{error}</p>
            <button
              type="button"
              onClick={() => loadStations(true)}
              className="mt-6 inline-flex rounded-full border border-slate-200 bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
            >
              Retry refresh
            </button>
          </div>
        ) : totalStations === 0 ? (
          <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
            <h2 className="text-2xl font-semibold text-slate-950">No charging stations available</h2>
            <p className="mt-3 text-slate-600">
              There are currently no stations available to monitor. Register stations in Supabase to populate this screen.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
                {stations.map((station) => {
                  const { label, tone } = getStationStatus(station)
                  return (
                    <button
                      key={station.id}
                      type="button"
                      onClick={() => setSelectedStation(station)}
                      className="group flex flex-col justify-between rounded-4xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:border-cyan-300 hover:bg-slate-100"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-slate-950">{station.name}</p>
                          <p className="mt-1 text-sm text-slate-600">{station.address || `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}`}</p>
                        </div>
                        {statusBadge(label, tone)}
                      </div>
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-600">Charger count</p>
                          <p className="mt-2 text-xl font-semibold text-slate-950">{station.totalChargers}</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-600">Type</p>
                          <p className="mt-2 text-xl font-semibold text-slate-950">{station.type}</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-600">Available now</p>
                          <p className="mt-2 text-xl font-semibold text-slate-950">
                            {station.liveAvailableChargers != null ? station.liveAvailableChargers : 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-600">Last update</p>
                          <p className="mt-2 text-xl font-semibold text-slate-950">
                            {station.liveUpdatedAt ? new Date(station.liveUpdatedAt).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Selected station</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {selectedStation ? selectedStation.name : 'Select a station to inspect'}
                    </p>
                  </div>
                  {selectedStation && (
                    <button
                      type="button"
                      onClick={() => setSelectedStation(null)}
                      className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Deselect
                    </button>
                  )}
                </div>

                {selectedStation ? (
                  <div className="mt-6 space-y-5">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-600">Location</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">{selectedStation.address || `${selectedStation.latitude.toFixed(4)}, ${selectedStation.longitude.toFixed(4)}`}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-600">Charger capacity</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">{selectedStation.totalChargers}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-600">Status</p>
                      <div className="mt-2">{statusBadge(getStationStatus(selectedStation).label, getStationStatus(selectedStation).tone)}</div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-600">Available now</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {selectedStation.liveAvailableChargers != null ? selectedStation.liveAvailableChargers : 'Not available'}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-600">Current queue</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {selectedStation.liveQueueLength != null ? selectedStation.liveQueueLength : 'Not available'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
                    Select a station card to see the full monitoring details here.
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  )
}

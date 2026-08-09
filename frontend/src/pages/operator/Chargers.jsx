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
  if (station.liveAvailableChargers == null) return { label: 'Offline / unavailable', tone: 'negative' }
  if (station.liveAvailableChargers === 0) return { label: 'Occupied', tone: 'warning' }
  return { label: 'Available', tone: 'positive' }
}

export default function Chargers() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedStation, setSelectedStation] = useState(null)

  useEffect(() => {
    let mounted = true

    const loadStations = async () => {
      setError(null)
      setLoading(true)

      try {
        const data = await fetchStations()
        if (mounted) setStations(data)
      } catch (err) {
        if (mounted) setError(err?.message || 'Unable to load charging station data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadStations()
    return () => {
      mounted = false
    }
  }, [])

  const stationSummaries = useMemo(() => {
    const stationsWithTelemetry = stations.filter((station) => station.liveAvailableChargers != null)
    const availableChargers = stationsWithTelemetry.reduce(
      (sum, station) => sum + Math.max(0, station.liveAvailableChargers),
      0,
    )
    const occupiedChargers = stationsWithTelemetry.reduce(
      (sum, station) => sum + Math.max(0, station.totalChargers - station.liveAvailableChargers),
      0,
    )
    const unavailableChargers = stations.reduce(
      (sum, station) => sum + (station.liveAvailableChargers == null ? station.totalChargers : 0),
      0,
    )

    return {
      totalStations: stations.length,
      availableChargers,
      occupiedChargers,
      unavailableChargers,
      statusCounts: stations.reduce((counts, station) => {
        const status = getStationStatus(station).label
        counts[status] = (counts[status] || 0) + 1
        return counts
      }, {}),
    }
  }, [stations])

  const filteredStations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return stations.filter((station) => {
      const matchesSearch =
        query === '' ||
        station.name.toLowerCase().includes(query) ||
        station.address.toLowerCase().includes(query)

      if (!matchesSearch) return false

      if (statusFilter === 'all') return true

      const { label } = getStationStatus(station)
      if (statusFilter === 'available') return label === 'Available'
      if (statusFilter === 'occupied') return label === 'Occupied'
      if (statusFilter === 'offline') return label === 'Offline / unavailable'
      return true
    })
  }, [stations, searchQuery, statusFilter])

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'available', label: 'Available' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'offline', label: 'Offline / unavailable' },
  ]

  return (
    <section className="min-h-screen bg-slate-950 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Operator Portal</p>
              <h1 className="mt-2 text-4xl font-semibold text-slate-950">Charging Stations</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Manage and monitor your registered charging stations.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                Total stations
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {loading ? '—' : formatNumber(stationSummaries.totalStations)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                Available chargers
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {loading ? '—' : formatNumber(stationSummaries.availableChargers)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                Occupied chargers
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {loading ? '—' : formatNumber(stationSummaries.occupiedChargers)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                Offline / unavailable
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {loading ? '—' : formatNumber(stationSummaries.unavailableChargers)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
              <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-6 grid gap-4">
                <div className="h-16 rounded-3xl bg-slate-100" />
                <div className="h-16 rounded-3xl bg-slate-100" />
                <div className="h-16 rounded-3xl bg-slate-100" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-4xl border border-rose-200 bg-rose-50 p-8 text-slate-950 shadow-sm shadow-rose-200/40">
            <h2 className="text-2xl font-semibold text-rose-800">Unable to load station data</h2>
            <p className="mt-3 text-slate-700">{error}</p>
            <p className="mt-4 max-w-2xl text-sm text-slate-600">
              Please refresh the page or check your network connection. If the problem persists, review your Supabase configuration.
            </p>
          </div>
        ) : stationSummaries.totalStations === 0 ? (
          <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
            <h2 className="text-2xl font-semibold text-slate-950">No charging stations registered yet</h2>
            <p className="mt-3 text-slate-600">
              There are currently no stations available for monitoring. Once stations are registered in Supabase, this page will display them.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr]">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-600">Search stations</span>
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by name or location"
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">Status filter</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setStatusFilter(option.value)}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            statusFilter === option.value
                              ? 'border-cyan-400 bg-cyan-500/10 text-cyan-700'
                              : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 shadow-sm shadow-slate-200/40">
                  <p className="font-semibold text-slate-950">Stations matching</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{formatNumber(filteredStations.length)}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
              <div className="hidden grid-cols-[1.5fr_1fr_1fr_0.9fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-600 md:grid">
                <div>Station</div>
                <div>Capacity</div>
                <div>Location</div>
                <div>Status</div>
                <div className="text-right">Action</div>
              </div>
              <div className="divide-y divide-slate-200">
                {filteredStations.map((station) => {
                  const { label, tone } = getStationStatus(station)
                  return (
                    <div key={station.id} className="flex flex-col gap-4 px-6 py-6 md:grid md:grid-cols-[1.5fr_1fr_1fr_0.9fr_0.9fr] md:items-center md:gap-0">
                      <div>
                        <p className="text-base font-semibold text-slate-950">{station.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{station.type}</p>
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>{station.totalChargers} chargers</p>
                        <p className="mt-1 text-slate-500">{station.connectorType || 'Unknown connector'}</p>
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>{station.address || `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(label, tone)}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedStation(station)}
                          className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedStation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-4xl bg-white p-8 shadow-2xl shadow-slate-950/20">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Station details</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">{selectedStation.name}</h2>
                <p className="mt-2 text-sm text-slate-600">{selectedStation.address || `${selectedStation.latitude.toFixed(4)}, ${selectedStation.longitude.toFixed(4)}`}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStation(null)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div>
                  <p className="text-sm font-semibold text-slate-600">Type</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{selectedStation.type}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Verification</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{selectedStation.verification}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Connector</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{selectedStation.connectorType || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Charging speed</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{selectedStation.speedKW ? `${selectedStation.speedKW} kW` : 'Unknown'}</p>
                </div>
              </div>

              <div className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div>
                  <p className="text-sm font-semibold text-slate-600">Availability</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {selectedStation.liveAvailableChargers != null ? `${selectedStation.liveAvailableChargers} available` : 'Telemetry unavailable'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Occupied chargers</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {selectedStation.liveAvailableChargers != null
                      ? `${Math.max(0, selectedStation.totalChargers - selectedStation.liveAvailableChargers)} occupied`
                      : 'Not available'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Queue length</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {selectedStation.liveQueueLength != null ? selectedStation.liveQueueLength : 'Not available'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Last updated</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {selectedStation.liveUpdatedAt
                      ? new Date(selectedStation.liveUpdatedAt).toLocaleString()
                      : 'Not available'}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-600">Total chargers</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{selectedStation.totalChargers}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-600">Price / kWh</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {selectedStation.pricePerKwh != null ? `₹${selectedStation.pricePerKwh}` : 'Not listed'}
                </p>
              </div>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-600">Operating hours</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{selectedStation.openingHours}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-600">CCTV enabled</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{selectedStation.cctvEnabled ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

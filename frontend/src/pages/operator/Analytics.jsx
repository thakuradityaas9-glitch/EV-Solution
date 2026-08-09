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

export default function Analytics() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    const loadStations = async () => {
      setError(null)
      setLoading(true)

      try {
        const data = await fetchStations()
        if (mounted) setStations(data)
      } catch (err) {
        if (mounted) setError(err?.message || 'Unable to load analytics data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadStations()
    return () => {
      mounted = false
    }
  }, [])

  const analytics = useMemo(() => {
    const totalStations = stations.length
    const totalChargers = stations.reduce((sum, station) => sum + station.totalChargers, 0)
    const stationsWithTelemetry = stations.filter((station) => station.liveAvailableChargers != null)
    const availableChargers = stationsWithTelemetry.reduce(
      (sum, station) => sum + Math.max(0, station.liveAvailableChargers),
      0,
    )
    const occupiedChargers = stationsWithTelemetry.reduce(
      (sum, station) => sum + Math.max(0, station.totalChargers - station.liveAvailableChargers),
      0,
    )
    const offlineChargers = stations.reduce(
      (sum, station) => sum + (station.liveAvailableChargers == null ? station.totalChargers : 0),
      0,
    )
    const availabilityPercent = totalChargers ? Math.round((availableChargers / totalChargers) * 100) : 0

    const distribution = stations.reduce(
      (counts, station) => {
        const { label } = getStationStatus(station)
        counts[label] = (counts[label] || 0) + 1
        return counts
      },
      {},
    )

    const stationComparison = stations
      .slice()
      .sort((a, b) => (b.totalChargers || 0) - (a.totalChargers || 0))
      .slice(0, 4)

    return {
      totalStations,
      totalChargers,
      availableChargers,
      occupiedChargers,
      offlineChargers,
      availabilityPercent,
      distribution,
      stationComparison,
    }
  }, [stations])

  const hasData = analytics.totalStations > 0

  return (
    <section className="min-h-screen bg-slate-950 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Operator Portal</p>
              <h1 className="mt-2 text-4xl font-semibold text-slate-950">Analytics</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Understand charging network performance and station activity.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
              <div className="h-6 w-56 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-28 rounded-3xl bg-slate-100" />
                ))}
              </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="h-72 rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40" />
              <div className="h-72 rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-4xl border border-rose-200 bg-rose-50 p-8 text-slate-950 shadow-sm shadow-rose-200/40">
            <h2 className="text-2xl font-semibold text-rose-800">Unable to load analytics data</h2>
            <p className="mt-3 text-slate-700">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex rounded-full border border-slate-200 bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        ) : !hasData ? (
          <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
            <h2 className="text-2xl font-semibold text-slate-950">No station data available yet</h2>
            <p className="mt-3 text-slate-600">
              Register charging stations in Supabase to begin tracking network analytics.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-700">
                  Total stations
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{formatNumber(analytics.totalStations)}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-700">
                  Total chargers
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{formatNumber(analytics.totalChargers)}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-700">
                  Available chargers
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{formatNumber(analytics.availableChargers)}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-700">
                  Occupied chargers
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{formatNumber(analytics.occupiedChargers)}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-700">
                  Network availability
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{analytics.totalChargers ? `${analytics.availabilityPercent}%` : 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Station distribution</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">Current station status</h2>
                  </div>
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {['Available', 'Occupied', 'Offline'].map((status) => (
                    <div key={status} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-semibold text-slate-600">{status}</p>
                      <p className="mt-4 text-3xl font-semibold text-slate-950">{formatNumber(analytics.distribution[status] || 0)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Charger availability</p>
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-100 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Available / total</span>
                    <span>{formatNumber(analytics.availableChargers)} / {formatNumber(analytics.totalChargers)}</span>
                  </div>
                  <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${analytics.availabilityPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Station comparison</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Largest stations by charger count</h2>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {analytics.stationComparison.map((station) => {
                  const { label, tone } = getStationStatus(station)
                  return (
                    <div key={station.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-950">{station.name}</p>
                          <p className="mt-1 text-sm text-slate-600">{station.type}</p>
                        </div>
                        {statusBadge(label, tone)}
                      </div>
                      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4">
                          <p className="font-semibold text-slate-900">Charger count</p>
                          <p className="mt-2 text-xl font-semibold text-slate-950">{station.totalChargers}</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-4">
                          <p className="font-semibold text-slate-900">Available now</p>
                          <p className="mt-2 text-xl font-semibold text-slate-950">
                            {station.liveAvailableChargers != null ? station.liveAvailableChargers : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Historical Network Analytics</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Future historical insights</h2>
                </div>
              </div>
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-slate-600">
                Historical analytics will appear once live station activity data is connected.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

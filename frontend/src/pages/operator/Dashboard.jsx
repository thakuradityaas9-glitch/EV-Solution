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

export default function Dashboard() {
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

  const totalStations = stations.length
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

  const activeStations = useMemo(() => {
    const liveStations = stations.filter(
      (station) => station.liveAvailableChargers != null || station.liveQueueLength != null,
    )

    if (liveStations.length) {
      return liveStations
        .slice()
        .sort((a, b) => {
          const queueA = a.liveQueueLength ?? 0
          const queueB = b.liveQueueLength ?? 0
          if (queueB !== queueA) return queueB - queueA
          const availA = a.liveAvailableChargers ?? -1
          const availB = b.liveAvailableChargers ?? -1
          return availA - availB
        })
        .slice(0, 5)
    }

    return stations.slice(0, 5)
  }, [stations])

  const stationStatusLabel = (station) => {
    if (station.liveAvailableChargers == null) return ['No telemetry', 'neutral']
    if (station.liveAvailableChargers === 0) return ['Full', 'negative']
    if (station.liveAvailableChargers < station.totalChargers * 0.25) return ['Limited', 'warning']
    return ['Available', 'positive']
  }

  const statusLegend = [
    ['Available', 'positive'],
    ['Limited', 'warning'],
    ['Full', 'negative'],
    ['No telemetry', 'neutral'],
  ]

  return (
    <section className="min-h-screen bg-slate-950 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Operator Portal</p>
              <h1 className="mt-2 text-4xl font-semibold text-slate-950">Operator Dashboard</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Monitor your charging network and station activity with live telemetry from registered stations.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                Total stations
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {loading ? '—' : formatNumber(totalStations)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                Known available chargers
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {loading ? '—' : formatNumber(availableChargers)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                Occupied chargers
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {loading ? '—' : formatNumber(occupiedChargers)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                Chargers without live telemetry
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {loading ? '—' : formatNumber(unavailableChargers)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-6 rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
              <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="space-y-4">
                <div className="h-16 rounded-3xl bg-slate-100" />
                <div className="h-16 rounded-3xl bg-slate-100" />
                <div className="h-16 rounded-3xl bg-slate-100" />
              </div>
            </div>
            <div className="space-y-6 rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
              <div className="h-6 w-40 animate-pulse rounded-full bg-slate-200" />
              <div className="space-y-4">
                <div className="h-24 rounded-3xl bg-slate-100" />
                <div className="h-24 rounded-3xl bg-slate-100" />
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
        ) : totalStations === 0 ? (
          <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
            <h2 className="text-2xl font-semibold text-slate-950">No charging stations registered yet</h2>
            <p className="mt-3 text-slate-600">
              There are currently no stations available for monitoring. Once stations are registered in Supabase, this dashboard will display their live status.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Live station activity</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">Top active stations</h2>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    {stationsWithTelemetry.length} stations reporting live data
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {activeStations.map((station) => {
                    const [label, tone] = stationStatusLabel(station)
                    return (
                      <div key={station.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-slate-950">{station.name}</p>
                            <p className="mt-1 text-sm text-slate-600">{station.address || `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}`}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {statusBadge(label, tone)}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-3xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-500">Charger capacity</p>
                            <p className="mt-2 text-lg font-semibold text-slate-950">{station.totalChargers}</p>
                          </div>
                          <div className="rounded-3xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-500">Available now</p>
                            <p className="mt-2 text-lg font-semibold text-slate-950">
                              {station.liveAvailableChargers != null ? station.liveAvailableChargers : 'No data'}
                            </p>
                          </div>
                          <div className="rounded-3xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-500">Current queue</p>
                            <p className="mt-2 text-lg font-semibold text-slate-950">
                              {station.liveQueueLength != null ? station.liveQueueLength : '—'}
                            </p>
                          </div>
                          <div className="rounded-3xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-500">Last update</p>
                            <p className="mt-2 text-lg font-semibold text-slate-950">
                              {station.liveUpdatedAt ? new Date(station.liveUpdatedAt).toLocaleString() : 'Not available'}
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
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Station status overview</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">Network status</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statusLegend.map(([label, tone]) => (
                      <span key={label} className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        tone === 'positive'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : tone === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : tone === 'negative'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-slate-200 bg-slate-100 text-slate-700'
                      }`}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {stations.map((station) => {
                    const [label, tone] = stationStatusLabel(station)
                    return (
                      <div key={station.id} className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-[1.5fr_1fr]">
                        <div>
                          <p className="text-base font-semibold text-slate-950">{station.name}</p>
                          <p className="mt-1 text-sm text-slate-600">{station.type} · {station.verification}</p>
                          <p className="mt-2 text-sm text-slate-600">{station.address || 'Location not listed'}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">{station.connectorType || 'Connector unknown'}</span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">{station.speedKW ? `${station.speedKW} kW` : 'Speed unknown'}</span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Rating {station.rating?.toFixed(1) ?? '—'}</span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                              {station.cctvEnabled ? 'CCTV enabled' : 'No CCTV'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-between gap-3 sm:items-end">
                          <div className="flex flex-wrap items-center gap-2">
                            {statusBadge(label, tone)}
                          </div>
                          <div className="grid w-full gap-3 sm:grid-cols-2">
                            <div className="rounded-3xl bg-white p-4 text-sm text-slate-600 shadow-sm shadow-slate-200/50">
                              <p className="font-semibold text-slate-950">Charger count</p>
                              <p className="mt-2 text-2xl font-semibold text-slate-950">{station.totalChargers}</p>
                            </div>
                            <div className="rounded-3xl bg-white p-4 text-sm text-slate-600 shadow-sm shadow-slate-200/50">
                              <p className="font-semibold text-slate-950">Available now</p>
                              <p className="mt-2 text-2xl font-semibold text-slate-950">
                                {station.liveAvailableChargers != null ? station.liveAvailableChargers : '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-4xl border border-slate-200 bg-slate-50 p-8 shadow-sm shadow-slate-200/40">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Telemetry summary</p>
                <div className="mt-6 grid gap-4">
                  <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/40">
                    <p className="text-sm text-slate-600">Stations reporting live data</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{formatNumber(stationsWithTelemetry.length)}</p>
                  </div>
                  <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/40">
                    <p className="text-sm text-slate-600">Stations without live telemetry</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{formatNumber(totalStations - stationsWithTelemetry.length)}</p>
                  </div>
                  <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/40">
                    <p className="text-sm text-slate-600">Stations pending verification</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{formatNumber(stations.filter((station) => station.verification === 'pending').length)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Network details</p>
                <div className="mt-6 space-y-4 text-sm text-slate-600">
                  <p>
                    {stations.filter((station) => station.type === 'Community Charger').length} community stations ·{' '}
                    {stations.filter((station) => station.type === 'Fast Charging Hub').length} fast charging hubs
                  </p>
                  <p>{formatNumber(stations.reduce((sum, station) => sum + station.totalChargers, 0))} total charger slots across network</p>
                  <p>{formatNumber(availableChargers)} reported available now</p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  )
}

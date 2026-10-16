import { memo } from 'react'
import { BoltIcon, StarIcon } from './icons.jsx'

// Mirrors the marker colour thresholds in DriverMap so card and pin always agree.
function getAvailability(station) {
  const total = station.totalChargers ?? 0
  const available = station.availableChargers ?? 0
  const pct = total > 0 ? (available / total) * 100 : 0
  const count = total > 0 ? `${available} of ${total} free` : `${available} free`

  if (available === 0) return { dot: 'bg-red-500', text: 'text-red-700', label: 'All in use', count }
  if (pct <= 35) return { dot: 'bg-amber-400', text: 'text-amber-700', label: 'Limited', count }
  return { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Available', count }
}

function Metric({ value, label }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  )
}

function StationCard({
  station,
  rank,
  highlighted = false,
  active = false,
  hovered = false,
  routedVia = false,
  emergencyMode = false,
  onSelect,
  onHover,
  onViewDetails,
  onUseStation,
}) {
  const availability = getAvailability(station)
  const amenities = Array.isArray(station.amenities) ? station.amenities : []
  const hasRating = Number(station.rating) > 0
  const subtitle = [station.type, station.connectorType].filter(Boolean).join(' · ')

  const surface = active
    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
    : hovered
      ? 'border-blue-300 bg-slate-50'
      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'

  const stop = (handler) => (event) => {
    event.stopPropagation()
    handler?.(station)
  }

  return (
    <article
      id={`station-card-${station.id}`}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`${station.name}. Select to show on map.`}
      onClick={() => onSelect?.(station)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.(station)
        }
      }}
      onMouseEnter={() => onHover?.(station.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(station.id)}
      onBlur={() => onHover?.(null)}
      className={`cursor-pointer rounded-xl border p-4 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 ${surface}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            highlighted ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {highlighted ? <BoltIcon className="h-4 w-4" /> : rank}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[15px] font-semibold leading-snug text-slate-900">{station.name}</h3>
            <span className="shrink-0 rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
              {station.recommendationScore}
            </span>
          </div>

          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className={`inline-flex items-center gap-1.5 font-semibold ${availability.text}`}>
              <span className={`h-2 w-2 rounded-full ${availability.dot}`} />
              {availability.label}
            </span>
            <span className="text-slate-500">{availability.count}</span>
            {hasRating && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                {station.rating}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {highlighted && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                {emergencyMode ? 'Nearest reachable' : 'Best match'}
              </span>
            )}
            {routedVia && (
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                On your route
              </span>
            )}
            {!station.reachable && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                Unreachable
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 border-y border-slate-100 py-2.5">
            <Metric value={station.etaMin != null ? `${station.etaMin} min` : '—'} label="ETA" />
            <Metric value={station.deviationKm != null ? `+${station.deviationKm} km` : '—'} label="Detour" />
            <Metric value={station.waitMin != null ? `${station.waitMin} min` : '—'} label="Wait" />
            <Metric value={station.speedKW != null ? `${station.speedKW} kW` : '—'} label="Speed" />
          </div>

          {station.batteryOnArrivalPercent != null && (
            <p className="mt-2 text-xs text-slate-600">
              Arrive with about <span className="font-semibold text-slate-900">{station.batteryOnArrivalPercent}%</span> battery
            </p>
          )}

          {station.reason &&
            (highlighted ? (
              <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-slate-700">
                <span className="font-semibold text-blue-700">Why this station? </span>
                {station.reason}
              </p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-slate-500">{station.reason}</p>
            ))}

          {amenities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {amenities.map((amenity) => (
                <span key={amenity} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {amenity}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {onUseStation && (
              <button
                type="button"
                disabled={routedVia}
                onClick={stop(onUseStation)}
                className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-default disabled:bg-slate-200 disabled:text-slate-500"
              >
                {routedVia ? 'Routing via here' : 'Route via here'}
              </button>
            )}
            <button
              type="button"
              onClick={stop(onViewDetails)}
              className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default memo(StationCard)

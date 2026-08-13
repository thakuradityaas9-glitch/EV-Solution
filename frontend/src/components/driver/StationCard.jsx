export default function StationCard({ station, highlighted, onViewDetails, emergencyMode }) {
  const reachabilityLabel = station.reachable ? 'REACHABLE' : 'UNREACHABLE'
  const reachabilityTone = station.reachable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'

  return (
    <article className={`group overflow-hidden rounded-[28px] border ${highlighted ? 'border-cyan-400 bg-cyan-50/60 shadow-lg shadow-cyan-300/20' : 'border-slate-200 bg-white shadow-sm shadow-slate-200/40'} transition`}> 
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">{highlighted ? 'Top choice' : station.type}</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">{highlighted ? `🥇 ${station.name}` : station.name}</h3>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] ${reachabilityTone}`}>
              {reachabilityLabel}
            </span>
            <div className="rounded-3xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Score {station.recommendationScore}</div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Distance</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{station.distanceKm} km</p>
            <p className="text-sm text-slate-500">+{station.deviationKm} km deviation</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">ETA</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{station.etaMin} min</p>
            <p className="text-sm text-slate-500">Wait {station.waitMin} min</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Speed</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{station.speedKW} kW</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Availability</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{station.availableChargers}/{station.totalChargers}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">⭐ {station.rating}</span>
          <span>{station.amenities.join('   ')}</span>
        </div>
        {station.reason && (
          <p className="mt-3 text-sm text-slate-500">{station.reason}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => onViewDetails(station)} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            View Details
          </button>
        </div>
      </div>
    </article>
  )
}

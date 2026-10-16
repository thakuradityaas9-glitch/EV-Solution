export default function DriverHeader({ profile, emergencyActive, onToggleEmergency }) {
  const displayName = profile?.full_name || 'Driver'

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">Hi, {displayName}</p>
          <p className="text-xs text-slate-500">Where are you headed?</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={emergencyActive}
        onClick={onToggleEmergency}
        title={
          emergencyActive
            ? 'Emergency mode is on: prioritising the nearest reachable chargers'
            : 'Turn on to prioritise the nearest reachable charger'
        }
        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
          emergencyActive
            ? 'border-red-600 bg-red-600 text-white shadow-sm hover:bg-red-700'
            : 'border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${emergencyActive ? 'animate-pulse bg-white' : 'bg-red-500'}`} />
        {emergencyActive ? 'Emergency on' : 'Emergency mode'}
      </button>
    </div>
  )
}

export default function DriverHeader({ profile, emergencyActive, onToggleEmergency }) {
  const displayName = profile?.full_name || 'Driver'

  return (
    <div className="flex flex-col gap-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Hi, {displayName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Plan your route, find chargers, and keep moving with confidence.</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800">{displayName?.charAt(0) ?? 'D'}</div>
          <div>
            <p className="text-sm font-semibold text-slate-950">{displayName}</p>
            <p className="text-xs text-slate-500">Driver profile</p>
          </div>
        </div>
        <button
          onClick={onToggleEmergency}
          className={`rounded-3xl px-5 py-3 text-sm font-semibold transition ${emergencyActive ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'border border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50'}`}
        >
          {emergencyActive ? 'Emergency Active' : 'Emergency Mode'}
        </button>
      </div>
    </div>
  )
}

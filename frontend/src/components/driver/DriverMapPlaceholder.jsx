export default function DriverMapPlaceholder({ markers = [] }) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 px-5 py-7 text-slate-100 shadow-lg shadow-slate-900/10">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(0,174,239,0.14),transparent_30%)]" />
      <div className="relative h-96 w-full">
        <svg viewBox="0 0 680 420" className="h-full w-full rounded-[28px]">
          <defs>
            <linearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00AEEF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <path d="M 70 340 C 170 300 230 240 320 230 C 420 220 500 170 590 140" fill="none" stroke="url(#routeGradient)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="70" cy="340" r="14" fill="#00AEEF" />
          <circle cx="590" cy="140" r="14" fill="#f97316" />
          {markers.map(marker => (
            <g key={marker.id}>
              <circle cx={marker.cx} cy={marker.cy} r="10" fill={marker.color} />
              <circle cx={marker.cx} cy={marker.cy} r="18" fill="transparent" stroke={marker.stroke} strokeWidth="2" />
            </g>
          ))}
        </svg>
      </div>
      <div className="relative mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current location</p>
          <p className="mt-2 text-sm font-semibold text-white">Riverfront Ave</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Destination</p>
          <p className="mt-2 text-sm font-semibold text-white">City Airport</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estimated route</p>
          <p className="mt-2 text-sm font-semibold text-white">18.4 km</p>
        </div>
      </div>
    </div>
  )
}

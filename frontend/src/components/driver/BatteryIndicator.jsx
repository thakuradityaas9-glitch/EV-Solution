export default function BatteryIndicator({ value }) {
  const fillWidth = Math.min(Math.max(value, 0), 100)
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4 text-sm font-medium text-slate-700">
        <span>Battery</span>
        <span className="text-slate-900">{value}%</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-cyan-600 transition-all" style={{ width: `${fillWidth}%` }} />
      </div>
    </div>
  )
}

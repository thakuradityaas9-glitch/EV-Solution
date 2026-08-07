export default function EmergencyModeToggle({ active, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-3 rounded-3xl px-5 py-3 text-sm font-semibold transition ${active ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'border border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50'}`}
    >
      <span className={active ? 'inline-flex h-3.5 w-3.5 rounded-full bg-white' : 'inline-flex h-3.5 w-3.5 rounded-full bg-red-600'} />
      <span>{active ? 'Emergency Mode Active' : 'Emergency Mode'}</span>
    </button>
  )
}

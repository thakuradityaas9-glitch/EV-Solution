export default function RoleCard({ roleKey, title, description, icon, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(roleKey)}
      className={`flex w-full flex-col items-start gap-3 rounded-2xl border px-5 py-6 text-left transition ${selected ? 'border-cyan-600 bg-cyan-50/60 shadow-md' : 'border-slate-200 bg-white hover:shadow-sm'}`}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-center text-lg font-semibold text-slate-900">{icon}</div>
        <div>
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </button>
  )
}

export default function InfoStep({ step, title }) {
  return (
    <div className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-lg font-semibold text-cyan-700 ring-1 ring-cyan-100">
        {step}
      </div>
      <p className="text-base font-medium text-slate-900">{title}</p>
    </div>
  )
}

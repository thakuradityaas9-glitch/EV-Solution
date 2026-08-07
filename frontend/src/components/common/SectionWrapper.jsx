export default function SectionWrapper({ title, subtitle, children }) {
  return (
    <section className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-700 bg-slate-900/80 p-10 shadow-xl shadow-slate-950/50">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-300">{subtitle}</p>}
        </header>
        <div>{children}</div>
      </div>
    </section>
  )
}

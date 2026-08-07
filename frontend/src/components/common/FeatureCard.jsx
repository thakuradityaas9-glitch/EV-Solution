export default function FeatureCard({ title, description, accentClass }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-semibold ${accentClass}`}>
        {title[0]}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </article>
  )
}

import { Link, useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  function scrollToHow() {
    const el = document.getElementById('how-it-works')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <main className="bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 py-6 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <a href="#hero" className="flex items-center gap-3 text-xl font-semibold text-slate-950">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200">
              EV
            </span>
            SmartCharge
          </a>
          <nav className="flex flex-wrap items-center gap-5 text-sm text-slate-600">
            <a href="#hero" className="transition hover:text-slate-950">Home</a>
            <button onClick={scrollToHow} className="transition hover:text-slate-950">How it works</button>
            <a href="#features" className="transition hover:text-slate-950">Features</a>
            <Link to="/login" className="transition hover:text-slate-950">Login</Link>
            <Link to="/login" className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-slate-950 transition hover:bg-slate-100">Get Started</Link>
          </nav>
        </div>
      </header>

      <section id="hero" className="overflow-hidden py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center rounded-full bg-cyan-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
              Find the right charger. Before you run out of charge.
            </p>
            <h1 className="text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Find the right charger. Before you run out of charge.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Combine route information, charger availability, waiting time, and AI-powered station intelligence to recommend the best charging station for your journey.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <button onClick={() => navigate('/login')} className="inline-flex w-full items-center justify-center rounded-full bg-cyan-700 px-8 py-3 text-base font-semibold text-white shadow-sm shadow-cyan-500/20 transition hover:bg-cyan-800 sm:w-auto">
                  Find a Charger
                </button>
                <button onClick={scrollToHow} className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-3 text-base font-semibold text-slate-950 transition hover:border-slate-400 sm:w-auto">
                  Explore How It Works
                </button>
            </div>
          </div>

          <div className="space-y-6 rounded-[32px] border border-slate-200 bg-slate-50 p-6 shadow-sm shadow-slate-200/40 lg:p-8">
            <div className="rounded-[28px] bg-white p-6 shadow-sm shadow-slate-200/40">
              <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
                <span>Search your route</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Eco-friendly</span>
              </div>
              <div className="space-y-5">
                <label className="block text-sm font-medium text-slate-700">From</label>
                <input
                  type="text"
                  placeholder="Enter starting location"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
                <label className="block text-sm font-medium text-slate-700">To</label>
                <input
                  type="text"
                  placeholder="Enter destination"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
                <button onClick={() => navigate('/login')} className="w-full rounded-3xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Find Chargers
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Battery saver</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">Route deviation minimized</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live status</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">Charger availability in real time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">How it works</p>
            <h2 className="text-4xl font-semibold text-slate-950">A simple 4-step flow to smarter charging.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-cyan-700">01</p>
              <h3 className="mt-4 text-xl font-semibold text-slate-950">Enter your destination</h3>
            </article>
            <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-cyan-700">02</p>
              <h3 className="mt-4 text-xl font-semibold text-slate-950">Discover nearby chargers</h3>
            </article>
            <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-cyan-700">03</p>
              <h3 className="mt-4 text-xl font-semibold text-slate-950">AI checks availability and waiting time</h3>
            </article>
            <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-cyan-700">04</p>
              <h3 className="mt-4 text-xl font-semibold text-slate-950">Get the best recommendation</h3>
            </article>
          </div>
        </div>
      </section>

      <section id="features" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Core features</p>
            <h2 className="text-4xl font-semibold text-slate-950">Built for intelligent charging and confident journeys.</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold text-cyan-700">Smart Recommendations</p>
              <p className="mt-3 text-base leading-7 text-slate-600">Personalized charger selection based on distance, speed, and station performance.</p>
            </article>
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold text-cyan-700">Live Availability</p>
              <p className="mt-3 text-base leading-7 text-slate-600">Up-to-date station status helps you avoid long wait times.</p>
            </article>
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold text-cyan-700">AI-Powered Occupancy Detection</p>
              <p className="mt-3 text-base leading-7 text-slate-600">AI analyzes parking and charger occupancy to surface the best stop.</p>
            </article>
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold text-cyan-700">Emergency Mode</p>
              <p className="mt-3 text-base leading-7 text-slate-600">Critical-battery routing prioritizes reachability, ETA, and arrival charge.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">AI & CCTV section</p>
              <h2 className="text-4xl font-semibold text-slate-950">AI-enhanced station intelligence for better recommendations.</h2>
              <p className="max-w-xl text-base leading-8 text-slate-600">
                CCTV imagery is processed by AI to detect vehicles, understand occupancy, and predict wait times so drivers can choose the best charger with confidence.
              </p>
            </div>
            <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-8 text-white shadow-xl shadow-slate-900/20">
              <div className="space-y-5">
                <div className="flex items-center gap-4 rounded-3xl bg-slate-900/90 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-200">CCTV</div>
                  <span className="text-base font-medium text-slate-100">CCTV</span>
                </div>
                <div className="flex items-center gap-4 rounded-3xl bg-slate-900/90 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-200">AI</div>
                  <span className="text-base font-medium text-slate-100">AI Vehicle Detection</span>
                </div>
                <div className="flex items-center gap-4 rounded-3xl bg-slate-900/90 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-200">O</div>
                  <span className="text-base font-medium text-slate-100">Charger Occupancy</span>
                </div>
                <div className="flex items-center gap-4 rounded-3xl bg-slate-900/90 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-200">T</div>
                  <span className="text-base font-medium text-slate-100">Waiting-Time Prediction</span>
                </div>
                <div className="flex items-center gap-4 rounded-3xl bg-slate-900/90 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-200">R</div>
                  <span className="text-base font-medium text-slate-100">Better Recommendations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Emergency Mode</p>
              <h2 className="text-4xl font-semibold text-slate-950">Emergency Mode for critical battery situations.</h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
                When your battery is critically low, the system prioritizes reachability, ETA, and remaining battery on arrival so you can charge safely.
              </p>
            </div>
            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
              <div className="space-y-5">
                <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">Reachability</p>
                  <p className="mt-2 text-slate-700">Always choose chargers you can reach safely with remaining battery.</p>
                </div>
                <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">ETA</p>
                  <p className="mt-2 text-slate-700">Estimate arrival time using route and station availability.</p>
                </div>
                <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">Battery remaining</p>
                  <p className="mt-2 text-slate-700">Keep enough battery for a safe arrival at the recommended charger.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <span className="font-semibold text-slate-950">ChargeIntel</span>
          <div className="flex flex-wrap gap-4">
            <a href="#hero" className="transition hover:text-slate-950">Home</a>
            <a href="#how-it-works" className="transition hover:text-slate-950">How it works</a>
            <a href="#features" className="transition hover:text-slate-950">Features</a>
          </div>
        </div>
      </footer>
    </main>
  )
}

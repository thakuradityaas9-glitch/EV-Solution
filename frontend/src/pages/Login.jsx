import { Link } from 'react-router-dom'

export default function Login() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-12 lg:px-8">
        <section className="hidden flex-1 flex-col gap-6 lg:flex">
          <div className="max-w-md">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">EV</div>
            <h2 className="mt-6 text-4xl font-semibold">Welcome back</h2>
            <p className="mt-4 text-slate-600">Sign in to plan your trips, view recommendations, and manage your driving experience.</p>
          </div>
        </section>

        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Log in</h3>
              <p className="mt-1 text-sm text-slate-600">Welcome back — please enter your details.</p>
            </div>
            <Link to="/" className="text-sm text-slate-500 hover:underline">Back to home</Link>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input type="email" placeholder="you@domain.com" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input type="password" placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
            </div>

            <button type="submit" className="w-full rounded-xl bg-cyan-700 px-4 py-3 text-white font-semibold">Log In</button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="text-sm text-slate-500">or</div>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button type="button" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700">Continue with Google</button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            <span>Don't have an account? </span>
            <Link to="/signup" className="text-cyan-700 font-semibold hover:underline">Sign up</Link>
          </div>
        </section>
      </div>
    </main>
  )
}

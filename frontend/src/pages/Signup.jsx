import { useState } from 'react'
import { Link } from 'react-router-dom'
import RoleCard from '../components/auth/RoleCard.jsx'

export default function Signup() {
  const [role, setRole] = useState('driver')

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-12 lg:px-8">
        <section className="hidden flex-1 flex-col gap-6 lg:flex">
          <div className="max-w-md">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">EV</div>
            <h2 className="mt-6 text-4xl font-semibold">Create your account</h2>
            <p className="mt-4 text-slate-600">Set up a free account to start finding smarter chargers or managing a station.</p>
          </div>
        </section>

        <section className="w-full max-w-2xl space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold">Create your account</h3>
                <p className="mt-1 text-sm text-slate-600">Choose a role and provide your details.</p>
              </div>
              <Link to="/" className="text-sm text-slate-500 hover:underline">Back to home</Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <input type="email" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <input type="password" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
                <input type="password" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-slate-700">I am signing up as</p>
              <div className="grid gap-3 md:grid-cols-2">
                <RoleCard roleKey="driver" title="Driver" description="Find smarter charging options while you travel." icon="🚗" selected={role === 'driver'} onClick={setRole} />
                <RoleCard roleKey="operator" title="Charging Station" description="Manage your station and monitor live operations." icon="🔌" selected={role === 'operator'} onClick={setRole} />
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <button className="w-full rounded-xl bg-cyan-700 px-4 py-3 text-white font-semibold">Create Account</button>
              <button className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700">Continue with Google</button>
            </div>
          </div>

          <div className="text-center text-sm text-slate-600">
            <span>Already have an account? </span>
            <Link to="/login" className="text-cyan-700 font-semibold hover:underline">Log in</Link>
          </div>
        </section>
      </div>
    </main>
  )
}

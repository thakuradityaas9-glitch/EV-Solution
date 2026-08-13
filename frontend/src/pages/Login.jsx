import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('')
  const navigate = useNavigate()

  const friendlyError = (err) => {
    if (!err) return 'An unexpected error occurred.'
    const msg = err?.message || String(err)
    if (/invalid login|invalid credentials|invalid email/i.test(msg)) return 'Invalid email or password.'
    if (/unconfirmed|not confirmed/i.test(msg)) return 'Please verify your email address before signing in.'
    if (/network/i.test(msg)) return 'Network error. Please try again.'
    return msg
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!email.trim()) return setMessageType('error') || setMessage('Email is required.')
    if (!password) return setMessageType('error') || setMessage('Password is required.')

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessageType('error')
        setMessage(friendlyError(error))
        return
      }

      const session = data?.session ?? null
      const user = session?.user ?? data?.user ?? null

      if (!session || !user) {
        // Possibly unverified email
        setMessageType('info')
        setMessage('Check your email to verify your account before signing in.')
        return
      }

      // Fetch profile and redirect based on role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profileData) {
        setMessageType('error')
        setMessage('Failed to load profile after sign in.')
        return
      }

      if (profileData.role === 'driver') navigate('/driver')
      else if (profileData.role === 'operator') navigate('/operator')
      else navigate('/')
    } catch (err) {
      setMessageType('error')
      setMessage(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@domain.com" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
            </div>

            {message && (
              <div className={`rounded-md p-3 text-sm ${messageType === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`} role="status">
                {message}
              </div>
            )}

            <button disabled={loading} type="submit" className="w-full rounded-xl bg-cyan-700 px-4 py-3 text-white font-semibold">{loading ? 'Signing in...' : 'Log In'}</button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="text-sm text-slate-500">or</div>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* <button type="button" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700">Continue with Google</button> */}
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

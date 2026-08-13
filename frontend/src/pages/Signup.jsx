import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import RoleCard from '../components/auth/RoleCard.jsx'
import supabase from '../lib/supabase'

export default function Signup() {
  const [role, setRole] = useState('driver')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('')
  const navigate = useNavigate()

  const resetMessage = () => {
    setMessage(null)
    setMessageType('')
  }

  const friendlyError = (err) => {
    if (!err) return 'An unexpected error occurred.'
    const msg = err?.message || String(err)
    if (/already exists|duplicate/i.test(msg)) return 'An account with this email already exists.'
    if (/invalid email/i.test(msg)) return 'Please provide a valid email address.'
    if (/password|weak password/i.test(msg)) return 'Please choose a stronger password.'
    if (/network/i.test(msg)) return 'Network error. Please try again.'
    return msg
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    resetMessage()

    // Validation
    if (!fullName.trim()) return setMessageType('error') || setMessage('Full name is required.')
    if (!email.trim()) return setMessageType('error') || setMessage('Email is required.')
    if (!password) return setMessageType('error') || setMessage('Password is required.')
    if (password !== confirmPassword) return setMessageType('error') || setMessage('Passwords do not match.')
    if (!role) return setMessageType('error') || setMessage('Please select a role.')

    setLoading(true)

    try {
      // Sign up with Supabase (v2 syntax) and include user metadata so
      // the auth.users.raw_user_meta_data contains full_name and role
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role,
          },
        },
      })

      if (error) {
        setMessageType('error')
        setMessage(friendlyError(error))
        return
      }

      // Check for session — if signup requires email confirmation there may be no session
      let session = null
      if (supabase.auth.getSession) {
        const res = await supabase.auth.getSession()
        session = res?.data?.session ?? null
      } else if (supabase.auth.session) {
        session = supabase.auth.session()
      }

      if (!session || !session.user) {
        // No active session — likely email verification required
        setMessageType('info')
        setMessage('Account created. Please check your email to verify your account before signing in.')
        return
      }

      const userId = session.user.id

      // Create profile row
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, full_name: fullName.trim(), role })

      if (insertError) {
        setMessageType('error')
        setMessage(friendlyError(insertError))
        return
      }

      // Fetch profile to determine role from DB (do not rely solely on form value)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profileError || !profileData) {
        setMessageType('error')
        setMessage('Account created, but failed to load profile. Please sign in.')
        return
      }

      // Redirect based on profile role
      if (profileData.role === 'driver') {
        navigate('/driver')
      } else if (profileData.role === 'operator') {
        navigate('/operator')
      } else {
        // Fallback
        navigate('/')
      }
    } catch (err) {
      setMessageType('error')
      setMessage(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

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
          <form onSubmit={handleSignup} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
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
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
                <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-slate-700">I am signing up as</p>
              <div className="grid gap-3 md:grid-cols-2">
                <RoleCard roleKey="driver" title="Driver" description="Find smarter charging options while you travel." icon="🚗" selected={role === 'driver'} onClick={setRole} />
                <RoleCard roleKey="operator" title="Charging Station" description="Manage your station and monitor live operations." icon="🔌" selected={role === 'operator'} onClick={setRole} />
              </div>
            </div>

            {message && (
              <div className={`mt-6 rounded-md p-3 text-sm ${messageType === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`} role="status">
                {message}
              </div>
            )}

            <div className="mt-6 grid gap-3">
              <button disabled={loading} type="submit" className="w-full rounded-xl bg-cyan-700 px-4 py-3 text-white font-semibold">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              {/* <button type="button" disabled className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700">Continue with Google</button> */}
            </div>
          </form>

          <div className="text-center text-sm text-slate-600">
            <span>Already have an account? </span>
            <Link to="/login" className="text-cyan-700 font-semibold hover:underline">Log in</Link>
          </div>
        </section>
      </div>
    </main>
  )
}

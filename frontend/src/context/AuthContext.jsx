import React, { createContext, useContext, useEffect, useState } from 'react'
import supabase from '../lib/supabase'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // helper to fetch profile for a single user id
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .eq('id', userId)
        .single()

      if (error) return { error }
      return { profile: data }
    } catch (err) {
      return { error: err }
    }
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        // Get current session (v2 uses getSession, older versions expose session())
        let currentSession = null
        if (supabase.auth.getSession) {
          const { data } = await supabase.auth.getSession()
          currentSession = data?.session ?? null
        } else if (supabase.auth.session) {
          currentSession = supabase.auth.session()
        }

        const currentUser = currentSession?.user ?? null
        if (!mounted) return
        setUser(currentUser)
        setSession(currentSession)

        if (currentUser) {
          const { profile: p, error } = await fetchProfile(currentUser.id)
          if (!mounted) return
          if (error) {
            setProfile(null)
          } else {
            setProfile(p ?? null)
          }
        } else {
          setProfile(null)
        }
      } catch (err) {
        // swallow - state remains null and UI can inspect `loading`
        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    // subscribe to auth changes
    const authListener = supabase.auth.onAuthStateChange((event, session) => {
      const currentSession = session ?? null
      const currentUser = currentSession?.user ?? null
      setUser(currentUser)
      setSession(currentSession)

      if (currentUser) {
        // fetch profile for the signed-in user
        fetchProfile(currentUser.id).then(({ profile: p }) => {
          setProfile(p ?? null)
        }).catch(() => setProfile(null))
      } else {
        setProfile(null)
      }
    })

    // cleanup
    return () => {
      mounted = false
      // unsubscribe in a few possible return shapes
      try {
        const subscription = authListener?.data?.subscription ?? authListener?.subscription ?? authListener
        subscription?.unsubscribe?.()
      } catch (e) {
        // ignore
      }
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      // clear local state immediately; onAuthStateChange will also update
      setUser(null)
      setSession(null)
      setProfile(null)
    } catch (err) {
      // surface later if needed; do not clear state here because onAuthStateChange will handle it
      console.error('Sign out error', err)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export default AuthContext

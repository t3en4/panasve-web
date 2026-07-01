import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [shelter, setShelter] = useState(null)   // si el usuario es un solicitante
  const [loading, setLoading] = useState(true)
  const [previewRole, setPreviewRoleState] = useState(() => {
    try { return sessionStorage.getItem('panasve-preview') || null } catch { return null }
  })

  function setPreviewRole(r) {
    setPreviewRoleState(r)
    try { r ? sessionStorage.setItem('panasve-preview', r) : sessionStorage.removeItem('panasve-preview') } catch { /* noop */ }
  }

  async function loadProfile(userId) {
    if (!userId) { setProfile(null); setShelter(null); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(prof || null)
    if (prof?.role === 'shelter') {
      const { data: sh } = await supabase.from('shelters').select('*').eq('owner_id', userId).maybeSingle()
      setShelter(sh || null)
    } else {
      setShelter(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess)
      await loadProfile(sess?.user?.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const realRole = profile?.role || null
  // El admin puede previsualizar la app como otro rol (solo lectura)
  const canPreview = realRole === 'admin'
  const effectiveRole = (canPreview && previewRole) ? previewRole : realRole
  const isPreview = canPreview && !!previewRole

  const value = {
    session,
    profile,
    shelter,
    loading,
    role: effectiveRole,
    realRole,
    isAdmin: effectiveRole === 'admin',
    isProvider: effectiveRole === 'provider',
    isShelter: effectiveRole === 'shelter',
    canPreview,
    isPreview,
    previewRole,
    setPreviewRole,
    refreshProfile: () => loadProfile(session?.user?.id),
    signOut: () => { setPreviewRole(null); return supabase.auth.signOut() },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)       // perfil REAL (sesión)
  const [shelter, setShelter] = useState(null)        // shelter REAL
  const [loading, setLoading] = useState(true)

  // Previsualización: como rol genérico o como una cuenta específica
  const [previewRole, setPreviewRoleState] = useState(() => {
    try { return sessionStorage.getItem('panasve-preview') || null } catch { return null }
  })
  const [previewUserId, setPreviewUserIdState] = useState(() => {
    try { return sessionStorage.getItem('panasve-preview-user') || null } catch { return null }
  })
  const [previewProfile, setPreviewProfile] = useState(null)
  const [previewShelter, setPreviewShelter] = useState(null)

  function setPreviewRole(r) {
    setPreviewRoleState(r)
    setPreviewUserIdState(null); setPreviewProfile(null); setPreviewShelter(null)
    try {
      sessionStorage.removeItem('panasve-preview-user')
      r ? sessionStorage.setItem('panasve-preview', r) : sessionStorage.removeItem('panasve-preview')
    } catch { /* noop */ }
  }

  function setPreviewUser(id) {
    setPreviewUserIdState(id)
    setPreviewRoleState(null)
    try {
      sessionStorage.removeItem('panasve-preview')
      id ? sessionStorage.setItem('panasve-preview-user', id) : sessionStorage.removeItem('panasve-preview-user')
    } catch { /* noop */ }
    if (!id) { setPreviewProfile(null); setPreviewShelter(null) }
  }

  function exitPreview() { setPreviewRole(null); setPreviewUser(null) }

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
  const canPreview = realRole === 'admin'

  // Cargar el perfil de la cuenta a impersonar (solo si el real es admin)
  useEffect(() => {
    if (!canPreview || !previewUserId) return
    let cancel = false
    ;(async () => {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', previewUserId).single()
      if (cancel) return
      setPreviewProfile(prof || null)
      if (prof?.role === 'shelter') {
        const { data: sh } = await supabase.from('shelters').select('*').eq('owner_id', previewUserId).maybeSingle()
        if (!cancel) setPreviewShelter(sh || null)
      } else {
        setPreviewShelter(null)
      }
    })()
    return () => { cancel = true }
  }, [canPreview, previewUserId])

  const impersonating = canPreview && !!previewUserId && !!previewProfile
  const isPreview = canPreview && (!!previewRole || !!previewUserId)

  const effectiveProfile = impersonating ? previewProfile : profile
  const effectiveShelter = impersonating ? previewShelter : shelter
  const effectiveRole = impersonating ? previewProfile?.role
    : (canPreview && previewRole) ? previewRole
    : realRole

  const value = {
    session,
    profile: effectiveProfile,
    shelter: effectiveShelter,
    loading,
    role: effectiveRole,
    realRole,
    isAdmin: effectiveRole === 'admin',
    isProvider: effectiveRole === 'provider',
    isShelter: effectiveRole === 'shelter',
    canPreview,
    isPreview,
    previewRole,
    previewUserId,
    previewName: impersonating ? (previewProfile?.name || previewProfile?.email) : null,
    setPreviewRole,
    setPreviewUser,
    exitPreview,
    refreshProfile: () => loadProfile(session?.user?.id),
    signOut: () => { exitPreview(); return supabase.auth.signOut() },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

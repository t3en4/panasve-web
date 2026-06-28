import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, traducirError } from '../lib/supabase'
import { useToast } from '../components/Toast'

export default function ResetPassword() {
  const toast = useToast()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')

  // Al llegar desde el enlace del correo, Supabase crea una sesión de recuperación
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    // Por si la sesión ya está lista al cargar
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function save() {
    if (pass.length < 6) { toast('La contraseña debe tener al menos 6 caracteres.', 'error'); return }
    if (pass !== pass2) { toast('Las contraseñas no coinciden.', 'error'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pass })
    setBusy(false)
    if (error) { toast(traducirError(error.message), 'error'); return }
    toast('Contraseña actualizada. ¡Listo!')
    navigate('/')
  }

  return (
    <div className="content">
      <div className="auth-wrap">
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div className="card-title">Nueva contraseña</div>
            <div className="card-sub">Crea una contraseña nueva para tu cuenta.</div>
          </div>
          {!ready ? (
            <div className="muted">Verificando el enlace… Si llegaste aquí desde el correo, espera un momento.</div>
          ) : (
            <>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Nueva contraseña</label>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="field" style={{ marginBottom: 18 }}>
                <label>Repetir contraseña</label>
                <input type="password" value={pass2} onChange={e => setPass2(e.target.value)}
                  placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && save()} />
              </div>
              <button className="btn primary" style={{ width: '100%' }} onClick={save} disabled={busy}>
                {busy ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

export default function Feedback() {
  const { profile, session } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState('feedback')
  const [mensaje, setMensaje] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function enviar() {
    if (!mensaje.trim()) { toast('Escribe tu mensaje.', 'error'); return }
    setBusy(true)
    try {
      const { error } = await supabase.functions.invoke('send-feedback', {
        body: {
          tipo,
          mensaje,
          email: profile?.email || email || 'Anónimo',
          contexto: profile ? `${profile.role} (${profile.email})` : 'Sin sesión',
        },
      })
      if (error) throw error
      toast('¡Gracias! Recibimos tu mensaje.')
      setMensaje(''); setEmail(''); setOpen(false)
    } catch (e) {
      console.error(e)
      toast('No se pudo enviar. Intenta de nuevo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button className="feedback-fab" onClick={() => setOpen(true)} aria-label="Enviar feedback">
        💬 Feedback
      </button>

      {open && (
        <div className="feedback-overlay" onClick={() => setOpen(false)}>
          <div className="feedback-modal" onClick={e => e.stopPropagation()}>
            <div className="feedback-head">
              <div className="card-title">Feedback y reportes</div>
              <button className="feedback-close" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="card-sub" style={{ marginBottom: 16 }}>Cuéntanos qué podemos mejorar o reporta un problema.</div>

            <div className="type-toggle" style={{ marginBottom: 14 }}>
              <button className={`type-btn ${tipo === 'feedback' ? 'active' : ''}`} style={{ padding: 10, fontSize: 14 }} onClick={() => setTipo('feedback')}>💬 Sugerencia</button>
              <button className={`type-btn ${tipo === 'problema' ? 'active' : ''}`} style={{ padding: 10, fontSize: 14 }} onClick={() => setTipo('problema')}>🐞 Problema</button>
            </div>

            {!profile && (
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Tu correo (opcional)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Para poder responderte" />
              </div>
            )}

            <div className="field" style={{ marginBottom: 16 }}>
              <label>Mensaje</label>
              <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder="Escribe aquí..." style={{ minHeight: 110 }} />
            </div>

            <button className="btn primary" style={{ width: '100%' }} onClick={enviar} disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

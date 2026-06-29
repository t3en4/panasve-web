import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, fmtDate } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, isProvider } = useAuth()
  const toast = useToast()
  const [order, setOrder] = useState(null)
  const [shelter, setShelter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data: o } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
      if (!active) return
      if (!o) { setNotFound(true); setLoading(false); return }
      setOrder(o)
      const { data: s } = await supabase.from('shelters').select('*').eq('id', o.shelter_id).maybeSingle()
      if (!active) return
      setShelter(s || null)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [id])

  // Si no hay sesión, mandamos a login guardando a dónde volver
  useEffect(() => {
    if (!loading && !profile && order) {
      navigate(`/login?next=/pedido/${id}`, { replace: true })
    }
  }, [loading, profile, order, id, navigate])

  async function claim() {
    setBusy(true)
    const { error } = await supabase.from('orders')
      .update({ status: 'progress', claimed_by: profile.id, claimed_by_name: profile.name, progress_at: new Date().toISOString() })
      .eq('id', id).eq('status', 'pending')
    setBusy(false)
    if (error) { toast('No se pudo tomar. Quizá ya fue tomado.', 'error'); return }
    toast('¡Pedido tomado! Gracias por ayudar, pana.')
    setOrder(o => ({ ...o, status: 'progress', claimed_by: profile.id, claimed_by_name: profile.name }))
  }

  if (loading) return <div className="content"><div className="loading">Cargando pedido…</div></div>

  if (notFound) {
    return (
      <div className="content">
        <div className="empty-state">
          <span className="icon">🔍</span>
          <p>No encontramos este pedido. Quizá fue eliminado o el enlace es incorrecto.</p>
          <button className="btn primary" style={{ marginTop: 14 }} onClick={() => navigate('/')}>Ver todos los pedidos</button>
        </div>
      </div>
    )
  }

  if (!profile) return null // redirigiendo a login

  const statusLabel = { pending: 'Pendiente', progress: 'En progreso', done: 'Entregado', cancelled: 'Cancelado' }
  const ubicacion = order.location || shelter?.location
  const lat = order.lat != null ? order.lat : shelter?.lat
  const lng = order.lng != null ? order.lng : shelter?.lng

  return (
    <div className="content" style={{ maxWidth: 640 }}>
      <button className="btn sm" style={{ marginBottom: 16 }} onClick={() => navigate('/')}>← Volver a pedidos</button>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className={`badge ${order.status}`}>{statusLabel[order.status]}</span>
          <span className="type-pill">{order.order_type === 'insumos' ? '📦 Insumos' : '🍽️ Comida'}</span>
        </div>

        <h1 className="section-title" style={{ marginBottom: 4 }}>{shelter?.name || 'Pedido'}</h1>
        <div className="muted" style={{ marginBottom: 16 }}>
          {shelter?.estado}{ubicacion ? ` · ${ubicacion}` : ''}
        </div>

        {order.order_type === 'comida' ? (
          <div style={{ marginBottom: 14 }}>
            <strong>{order.people} personas</strong>
            {(order.meals || []).length > 0 && <> · {(order.meals || []).join(', ')}</>}
            {order.allergies && <div className="muted" style={{ marginTop: 6 }}>Alergias / notas: {order.allergies}</div>}
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <strong>{(order.items || []).length} insumos:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {(order.items || []).map((it, i) => (
                <li key={i}>{it.name}{it.qty ? ` — ${it.qty}` : ''}</li>
              ))}
            </ul>
          </div>
        )}

        {order.notes && (
          <div className="order-notes" style={{ marginBottom: 14 }}>
            <strong>Notas:</strong><br />
            <span style={{ whiteSpace: 'pre-wrap' }}>{order.notes}</span>
          </div>
        )}

        <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Publicado el {fmtDate(order.created_at)}
          {order.claimed_by_name && <> · Tomado por {order.claimed_by_name}</>}
        </div>

        {lat != null && (
          <a className="btn sm" target="_blank" rel="noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}>📍 Ver ubicación en el mapa</a>
        )}

        {/* Acción para proveedores */}
        {isProvider && order.status === 'pending' && (
          <div style={{ marginTop: 18 }}>
            <button className="btn primary" onClick={claim} disabled={busy}>
              {busy ? 'Tomando…' : 'Tomar este pedido'}
            </button>
          </div>
        )}
        {isProvider && order.status === 'progress' && order.claimed_by === profile.id && (
          <div className="muted" style={{ marginTop: 18 }}>Ya tomaste este pedido. Puedes gestionarlo desde "Mis pedidos".</div>
        )}
        {order.status === 'progress' && order.claimed_by !== profile.id && (
          <div className="muted" style={{ marginTop: 18 }}>Este pedido ya fue tomado por otro proveedor.</div>
        )}
      </div>
    </div>
  )
}

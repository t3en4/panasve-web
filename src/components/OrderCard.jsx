import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, fmtDate, distanceKm } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

const STATUS = {
  pending: { label: 'Pendiente', cls: 'pending' },
  progress: { label: 'En progreso', cls: 'progress' },
  done: { label: 'Entregado', cls: 'done' },
  cancelled: { label: 'Cancelado', cls: 'cancelled' },
}

export default function OrderCard({ order, shelter, onClaim, onDeliver, onRelease, onCancel, busy }) {
  const { profile, shelter: myShelter, isShelter } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const st = STATUS[order.status] || STATUS.pending
  const mine = profile && order.claimed_by === profile.id
  const ownShelter = isShelter && myShelter && order.shelter_id === myShelter.id

  async function compartir() {
    const url = `${window.location.origin}/pedido/${order.id}`
    const titulo = `Pedido en PanasVE — ${shelter?.name || ''}`.trim()
    // Usa el menú nativo de compartir en móvil si está disponible
    if (navigator.share) {
      try { await navigator.share({ title: titulo, url }); return } catch { /* cancelado */ }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast('Enlace copiado. ¡Compártelo con quien pueda ayudar!')
    } catch {
      toast('Copia este enlace: ' + url)
    }
  }

  const [expanded, setExpanded] = useState(false)
  const [history, setHistory] = useState(null)
  const [loadingHist, setLoadingHist] = useState(false)

  async function loadHistory() {
    if (history !== null) return
    setLoadingHist(true)
    const { data } = await supabase
      .from('order_history').select('*').eq('order_id', order.id).order('created_at', { ascending: true })
    setHistory(data || [])
    setLoadingHist(false)
  }

  function toggle() {
    const next = !expanded
    setExpanded(next)
    if (next) loadHistory()
  }

  // Ubicación efectiva: la del pedido si existe, si no la del refugio
  const oLat = order.lat != null ? order.lat : shelter?.lat
  const oLng = order.lng != null ? order.lng : shelter?.lng
  const oLocation = order.location || shelter?.location

  let dist = null
  if (profile?.lat != null && oLat != null) {
    const d = distanceKm(profile.lat, profile.lng, oLat, oLng)
    if (d != null) dist = d.toFixed(1)
  }

  const mapsUrl = oLat != null ? `https://maps.google.com/?q=${oLat},${oLng}` : null
  const isInsumos = order.order_type === 'insumos'
  // Resumen corto para la vista colapsada
  const resumen = isInsumos
    ? `${(order.items || []).length} insumo${(order.items || []).length === 1 ? '' : 's'}`
    : `${order.people} pers. · ${(order.meals || []).join(', ')}`

  const hasActions = profile && (
    (!ownShelter && (order.status === 'pending' || (order.status === 'progress' && mine))) ||
    (ownShelter && order.status === 'pending')
  )

  return (
    <div className={`order-card ${order.status === 'progress' && mine ? 'mine' : ''} ${order.status === 'cancelled' ? 'cancelled-card' : ''}`}>
      {/* Cabecera siempre visible (clic para expandir) */}
      <button className="order-head" onClick={toggle} aria-expanded={expanded}>
        <span className="order-chevron">{expanded ? '▾' : '▸'}</span>
        <span className={`badge ${st.cls}`}>{st.label}</span>
        <span className="order-head-name">{shelter?.name || 'Refugio'}</span>
        <span className={`type-pill ${isInsumos ? 'insumos' : 'comida'}`}>{isInsumos ? '📦' : '🍽️'}</span>
        <span className="order-head-summary">{resumen}</span>
        {dist && <span className="dist-pill">{dist} km</span>}
      </button>

      {expanded && (
        <div className="order-body">
          {order.status !== 'pending' && order.status !== 'cancelled' && order.claimed_by_name && (
            <div className="assignee">
              <span className="assignee-dot" />
              Asignado a <strong>&nbsp;{order.claimed_by_name}</strong>
              {mine && <span className="you-tag">tú</span>}
            </div>
          )}

          {isInsumos ? (
            <div className="insumos-table">
              {(order.items || []).map((it, i) => (
                <div className="insumo-line" key={i}><span>{it.name}</span><span className="insumo-qty">{it.qty}</span></div>
              ))}
            </div>
          ) : (
            <div className="order-info">
              <div><span className="label">Personas:</span>{order.people}</div>
              <div><span className="label">Comidas:</span>{(order.meals || []).join(', ')}</div>
            </div>
          )}

          <div className="order-info" style={{ marginTop: 8 }}>
            <div><span className="label">Contacto:</span>{shelter?.contact || '—'}</div>
            <div><span className="label">Teléfono:</span>{shelter?.phone || '—'}</div>
            {oLocation && <div><span className="label">Ubicación:</span>{oLocation}</div>}
            {shelter?.estado && <div><span className="label">Estado:</span>{shelter.estado}</div>}
            {shelter?.instagram && <div><span className="label">Instagram:</span>{shelter.instagram}</div>}
            {!isInsumos && order.allergies && <div style={{ gridColumn: '1 / -1' }}><span className="label" style={{ color: 'var(--danger)' }}>⚠️ Alergias:</span>{order.allergies}</div>}
            {order.notes && <div style={{ gridColumn: '1 / -1' }}><span className="label">Notas:</span>{order.notes}</div>}
            {mapsUrl && <div style={{ gridColumn: '1 / -1' }}><a href={mapsUrl} target="_blank" rel="noreferrer">📍 Ver en mapa</a></div>}
          </div>

          <div className="timestamp">Pedido: {fmtDate(order.created_at)}</div>

          {/* Historial */}
          <div className="history-box" style={{ marginTop: 10 }}>
            <div className="history-title">Historial</div>
            {loadingHist ? (
              <div className="muted" style={{ fontSize: 13 }}>Cargando…</div>
            ) : !history || history.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>Sin eventos registrados todavía.</div>
            ) : (
              <ul className="history-list">
                {history.map(h => (
                  <li key={h.id}>
                    <span className={`history-dot ${STATUS[h.status]?.cls || ''}`} />
                    <div>
                      <div className="history-note">{h.note}</div>
                      <div className="history-time">{fmtDate(h.created_at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasActions && (
            <div className="order-actions" style={{ marginTop: 14 }}>
              {!ownShelter && order.status === 'pending' && (
                <button className="btn sm primary" disabled={busy} onClick={() => onClaim(order)}>Tomar pedido</button>
              )}
              {!ownShelter && order.status === 'progress' && mine && (
                <>
                  <button className="btn sm success" disabled={busy} onClick={() => onDeliver(order)}>Marcar entregado</button>
                  <button className="btn sm" disabled={busy} onClick={() => onRelease(order)}>Liberar</button>
                </>
              )}
              {ownShelter && order.status === 'pending' && (
                <>
                  <button className="btn sm" onClick={() => navigate(`/editar/${order.id}`)}>Editar</button>
                  <button className="btn sm danger-btn" disabled={busy} onClick={() => onCancel(order)}>Cancelar pedido</button>
                </>
              )}
              <button className="btn sm" onClick={compartir}>🔗 Compartir</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

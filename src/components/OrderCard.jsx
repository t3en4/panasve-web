import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, fmtDate, distanceKm } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STATUS = {
  pending: { label: 'Pendiente', cls: 'pending' },
  progress: { label: 'En progreso', cls: 'progress' },
  done: { label: 'Entregado', cls: 'done' },
  cancelled: { label: 'Cancelado', cls: 'cancelled' },
}

export default function OrderCard({ order, shelter, onClaim, onDeliver, onRelease, onCancel, busy }) {
  const { profile, shelter: myShelter, isShelter } = useAuth()
  const navigate = useNavigate()
  const st = STATUS[order.status] || STATUS.pending
  const mine = profile && order.claimed_by === profile.id
  const ownShelter = isShelter && myShelter && order.shelter_id === myShelter.id

  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState(null)
  const [loadingHist, setLoadingHist] = useState(false)

  async function toggleHistory() {
    const next = !showHistory
    setShowHistory(next)
    if (next && history === null) {
      setLoadingHist(true)
      const { data } = await supabase
        .from('order_history').select('*').eq('order_id', order.id).order('created_at', { ascending: true })
      setHistory(data || [])
      setLoadingHist(false)
    }
  }

  let dist = null
  if (profile?.lat != null && shelter?.lat != null) {
    const d = distanceKm(profile.lat, profile.lng, shelter.lat, shelter.lng)
    if (d != null) dist = d.toFixed(1)
  }

  const mapsUrl = shelter?.lat != null ? `https://maps.google.com/?q=${shelter.lat},${shelter.lng}` : null
  const isInsumos = order.order_type === 'insumos'

  return (
    <div className={`order-card ${order.status === 'progress' && mine ? 'mine' : ''} ${order.status === 'cancelled' ? 'cancelled-card' : ''}`}>
      <div className="order-meta">
        <span className={`badge ${st.cls}`}>{st.label}</span>
        <span className={`type-pill ${isInsumos ? 'insumos' : 'comida'}`}>{isInsumos ? '📦 Insumos' : '🍽️ Comida'}</span>
        <span className="order-name">{shelter?.name || 'Refugio'}</span>
        {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer">📍 Ver en mapa</a>}
        {dist && <span className="dist-pill">{dist} km</span>}
      </div>

      {order.status !== 'pending' && order.status !== 'cancelled' && order.claimed_by_name && (
        <div className="assignee">
          <span className="assignee-dot" />
          Asignado a <strong>&nbsp;{order.claimed_by_name}</strong>
          {mine && <span className="you-tag">tú</span>}
        </div>
      )}

      {/* Contenido según tipo */}
      {isInsumos ? (
        <div className="insumos-table">
          {(order.items || []).map((it, i) => (
            <div className="insumo-line" key={i}>
              <span>{it.name}</span>
              <span className="insumo-qty">{it.qty}</span>
            </div>
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
        {shelter?.location && <div><span className="label">Ubicación:</span>{shelter.location}</div>}
        {shelter?.instagram && <div><span className="label">Instagram:</span>{shelter.instagram}</div>}
        {order.notes && <div style={{ gridColumn: '1 / -1' }}><span className="label">Notas:</span>{order.notes}</div>}
      </div>

      <div className="timestamp">Pedido: {fmtDate(order.created_at)}</div>

      <button className="history-toggle" onClick={toggleHistory}>
        {showHistory ? '▾' : '▸'} Historial del pedido
      </button>
      {showHistory && (
        <div className="history-box">
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
      )}

      {/* Acciones de proveedor */}
      {profile && !ownShelter && (order.status === 'pending' || (order.status === 'progress' && mine)) && (
        <>
          <div className="divider" />
          <div className="order-actions">
            {order.status === 'pending' && (
              <button className="btn sm primary" disabled={busy} onClick={() => onClaim(order)}>Tomar pedido</button>
            )}
            {order.status === 'progress' && mine && (
              <>
                <button className="btn sm success" disabled={busy} onClick={() => onDeliver(order)}>Marcar entregado</button>
                <button className="btn sm" disabled={busy} onClick={() => onRelease(order)}>Liberar</button>
              </>
            )}
          </div>
        </>
      )}

      {/* Acciones del refugio dueño (solo si pendiente) */}
      {ownShelter && order.status === 'pending' && (
        <>
          <div className="divider" />
          <div className="order-actions">
            <button className="btn sm" onClick={() => navigate(`/editar/${order.id}`)}>Editar</button>
            <button className="btn sm danger-btn" disabled={busy} onClick={() => onCancel(order)}>Cancelar pedido</button>
          </div>
        </>
      )}
    </div>
  )
}

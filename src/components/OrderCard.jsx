import { fmtDate, distanceKm } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STATUS = {
  pending: { label: 'Pendiente', cls: 'pending' },
  progress: { label: 'En progreso', cls: 'progress' },
  done: { label: 'Entregado', cls: 'done' },
}

export default function OrderCard({ order, shelter, onClaim, onDeliver, onRelease, busy }) {
  const { profile } = useAuth()
  const st = STATUS[order.status] || STATUS.pending
  const mine = profile && order.claimed_by === profile.id

  let dist = null
  if (profile?.lat != null && shelter?.lat != null) {
    const d = distanceKm(profile.lat, profile.lng, shelter.lat, shelter.lng)
    if (d != null) dist = d.toFixed(1)
  }

  const mapsUrl = shelter?.lat != null
    ? `https://maps.google.com/?q=${shelter.lat},${shelter.lng}`
    : null

  return (
    <div className={`order-card ${order.status === 'progress' && mine ? 'mine' : ''}`}>
      <div className="order-meta">
        <span className={`badge ${st.cls}`}>{st.label}</span>
        <span className="order-name">{shelter?.name || 'Refugio'}</span>
        {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer">📍 Ver en mapa</a>}
        {dist && <span className="dist-pill">{dist} km</span>}
      </div>

      <div className="order-info">
        <div><span className="label">Personas:</span>{order.people}</div>
        <div><span className="label">Comidas:</span>{(order.meals || []).join(', ')}</div>
        <div><span className="label">Contacto:</span>{shelter?.contact || '—'}</div>
        <div><span className="label">Teléfono:</span>{shelter?.phone || '—'}</div>
        {shelter?.location && <div><span className="label">Ubicación:</span>{shelter.location}</div>}
        {shelter?.instagram && <div><span className="label">Instagram:</span>{shelter.instagram}</div>}
        {order.notes && <div style={{ gridColumn: '1 / -1' }}><span className="label">Notas:</span>{order.notes}</div>}
      </div>

      <div className="timestamp">
        Pedido: {fmtDate(order.created_at)}
        {order.progress_at && ` · Tomado: ${fmtDate(order.progress_at)}`}
        {order.done_at && ` · Entregado: ${fmtDate(order.done_at)}`}
      </div>

      {profile && (order.status === 'pending' || (order.status === 'progress' && mine)) && (
        <>
          <div className="divider" />
          <div className="order-actions">
            {order.status === 'pending' && (
              <button className="btn sm primary" disabled={busy} onClick={() => onClaim(order)}>
                Tomar pedido
              </button>
            )}
            {order.status === 'progress' && mine && (
              <>
                <button className="btn sm success" disabled={busy} onClick={() => onDeliver(order)}>
                  Marcar entregado
                </button>
                <button className="btn sm" disabled={busy} onClick={() => onRelease(order)}>
                  Liberar
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

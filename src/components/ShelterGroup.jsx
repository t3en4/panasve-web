import { useState, useEffect } from 'react'
import { supabase, distanceKm, fmtDate } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import FoodContributions from './FoodContributions'
import { StatusDot, StatusLegend } from './StatusDot'

// Tarjeta colapsable de un refugio. Al expandir muestra la info compartida
// una sola vez (ubicación, contacto, notas, mapa) y luego una línea por item.
export default function ShelterGroup({ resumen, tipoFilter, statusFilter, myLat, myLng,
  onClaim, onDeliver, onRelease, onCancel, busy }) {
  const { profile, isProvider, isShelter, shelter: myShelter, isPreview } = useAuth()
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState(null)   // null = aún no cargado
  const [shelterObj, setShelterObj] = useState(null)
  const [loading, setLoading] = useState(false)

  const dist = (myLat != null && resumen.lat != null)
    ? distanceKm(myLat, myLng, resumen.lat, resumen.lng) : null

  const ownShelter = isShelter && myShelter && myShelter.id === resumen.shelter_id

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && orders === null) await recargar()
  }

  // Recargar cuando cambian los filtros (si el grupo ya está abierto)
  useEffect(() => {
    if (open) recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, tipoFilter])

  async function recargar() {
    setLoading(true)
    const [{ data: s }, ordersData] = await Promise.all([
      shelterObj ? Promise.resolve({ data: shelterObj }) :
        supabase.from('shelters').select('*').eq('id', resumen.shelter_id).maybeSingle(),
      (async () => {
        let q = supabase.from('orders').select('*')
          .eq('shelter_id', resumen.shelter_id)
          .order('created_at', { ascending: false })
        // Filtro de status: si es 'all'/vacío, mostramos activos (pendiente + progreso)
        if (statusFilter && statusFilter !== 'all') {
          q = q.eq('status', statusFilter)
        } else {
          q = q.in('status', ['pending', 'progress'])
        }
        if (tipoFilter !== 'todos') q = q.eq('order_type', tipoFilter)
        const { data } = await q
        return data || []
      })(),
    ])
    if (s) setShelterObj(s)

    // Para los pedidos de comida, traer la suma de aportes (progreso inline)
    const comidaIds = ordersData.filter(o => o.order_type === 'comida').map(o => o.id)
    if (comidaIds.length) {
      const { data: contribs } = await supabase.from('order_contributions')
        .select('order_id, amount').in('order_id', comidaIds)
      const sums = {}
      for (const c of (contribs || [])) sums[c.order_id] = (sums[c.order_id] || 0) + (c.amount || 0)
      for (const o of ordersData) if (o.order_type === 'comida') o.contributed = sums[o.id] || 0
    }

    setOrders(ordersData)
    setLoading(false)
  }

  // Conteo según los filtros activos
  let count
  if (statusFilter === 'pending') count = resumen.pending_count
  else if (statusFilter === 'progress') count = resumen.progress_count
  else if (statusFilter === 'done') count = resumen.done_count
  else count = tipoFilter === 'comida' ? resumen.comida_count
    : tipoFilter === 'insumos' ? resumen.insumos_count
    : resumen.total_count
  if (Number(count) === 0) return null

  const mapsUrl = (resumen.lat != null && resumen.lng != null)
    ? `https://www.google.com/maps/search/?api=1&query=${resumen.lat},${resumen.lng}` : null

  return (
    <div className={`shelter-group ${open ? 'open' : ''}`}>
      <button className="shelter-group-head" onClick={toggle}>
        <span className="shelter-group-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="shelter-group-info">
          <span className="shelter-group-name">{resumen.name}</span>
          <span className="shelter-group-meta">
            {resumen.estado || 's/e'}
            {dist != null && ` · ${dist.toFixed(1)} km`}
          </span>
        </span>
        <span className="shelter-group-count">{count} {Number(count) === 1 ? 'pedido' : 'pedidos'}</span>
      </button>

      {open && (
        <div className="shelter-group-body">
          {loading ? (
            <div className="loading" style={{ padding: 16 }}>Cargando pedidos…</div>
          ) : (
            <>
              {/* Info compartida del refugio (una sola vez) */}
              <div className="sg-shared">
                <div className="sg-shared-grid">
                  <div><span className="label">Contacto:</span> {shelterObj?.contact || '—'}</div>
                  <div><span className="label">Teléfono:</span> {shelterObj?.phone || '—'}</div>
                  {(shelterObj?.location || resumen.location) && (
                    <div className="sg-shared-full"><span className="label">Ubicación:</span> {shelterObj?.location || resumen.location}</div>
                  )}
                  {shelterObj?.instagram && (
                    <div><span className="label">Instagram:</span> {shelterObj.instagram}</div>
                  )}
                </div>
                {mapsUrl && <a className="sg-shared-map" href={mapsUrl} target="_blank" rel="noreferrer">📍 Ver en mapa</a>}
                <StatusLegend />
              </div>

              {/* Lista de items: una línea por pedido */}
              {(orders || []).length === 0 ? (
                <div className="muted" style={{ padding: 12 }}>Sin pedidos.</div>
              ) : (
                <div className="sg-items">
                  {orders.map(o => (
                    <ItemLine key={o.id} order={o} shelterObj={shelterObj || {}} profile={profile}
                      isProvider={isProvider} ownShelter={ownShelter} busy={busy} isPreview={isPreview}
                      onClaim={onClaim} onDeliver={onDeliver} onRelease={onRelease} onCancel={onCancel}
                      onChanged={recargar} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Una línea por pedido/item. ⊕ expande notas/detalle puntual.
function ItemLine({ order, shelterObj, profile, isProvider, ownShelter, busy, isPreview,
  onClaim, onDeliver, onRelease, onCancel, onChanged }) {
  const [showNotes, setShowNotes] = useState(false)
  const isInsumos = order.order_type === 'insumos'
  const mine = profile && order.claimed_by === profile.id

  const label = isInsumos
    ? (order.items?.[0]?.name || '1 insumo')
    : `Comida · ${order.people} personas`

  // Progreso de comida (inline)
  const meta = order.people || 0
  const cubierto = order.contributed || 0
  const pct = meta > 0 ? Math.min(100, Math.round((cubierto / meta) * 100)) : 0

  const qty = isInsumos ? order.items?.[0]?.qty : null
  const tieneDetalle = qty || order.allergies || order.notes

  async function compartir() {
    const url = `${window.location.origin}/pedido/${order.id}`
    try { await navigator.clipboard.writeText(url) } catch { /* noop */ }
  }

  return (
    <div className="sg-item">
      <div className="sg-item-main">
        <StatusDot status={order.status} />
        <span className="sg-item-name">
          {label}
          {!isInsumos && (
            <span className="sg-progress">
              <span className="sg-progress-track"><span className={`sg-progress-fill ${cubierto >= meta && meta > 0 ? 'done' : ''}`} style={{ width: `${pct}%` }} /></span>
              <span className="sg-progress-label">{cubierto}/{meta}</span>
            </span>
          )}
        </span>
        <span className="sg-item-actions">
          {isInsumos && isProvider && !isPreview && order.status === 'pending' && (
            <button className="btn xs primary" disabled={busy} onClick={async () => { await onClaim(order); onChanged && onChanged() }}>Tomar</button>
          )}
          {isInsumos && isProvider && !isPreview && order.status === 'progress' && mine && (
            <>
              <button className="btn xs success" disabled={busy} onClick={async () => { await onDeliver(order); onChanged && onChanged() }}>Entregado</button>
              <button className="btn xs" disabled={busy} onClick={async () => { await onRelease(order); onChanged && onChanged() }}>Liberar</button>
            </>
          )}
          {!isInsumos && isProvider && !isPreview && order.status !== 'done' && (
            <button className="btn xs primary" onClick={() => setShowNotes(true)}>Aportar</button>
          )}
          <button className="btn xs" onClick={compartir} title="Copiar enlace">🔗</button>
          {(tieneDetalle || !isInsumos) && (
            <button className="btn xs sg-expand" onClick={() => setShowNotes(s => !s)} title="Ver más">
              {showNotes ? '⊖' : '⊕'}
            </button>
          )}
        </span>
      </div>

      {showNotes && (
        <div className="sg-item-detail">
          {qty ? <div><span className="label">Cantidad:</span> {qty}</div> : null}
          {!isInsumos && (order.meals || []).length > 0 && <div><span className="label">Comidas:</span> {(order.meals || []).join(', ')}</div>}
          {order.allergies && <div><span className="label" style={{ color: 'var(--danger)' }}>⚠️ Alergias:</span> {order.allergies}</div>}
          {order.notes && <div><span className="label">Notas:</span> {order.notes}</div>}
          <div className="muted" style={{ fontSize: 12 }}>Pedido: {fmtDate(order.created_at)}</div>
          {!isInsumos && !ownShelter && <div style={{ marginTop: 10 }}><FoodContributions order={order} onChanged={onChanged} /></div>}
        </div>
      )}
    </div>
  )
}

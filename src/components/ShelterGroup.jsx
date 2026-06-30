import { useState } from 'react'
import { supabase, distanceKm } from '../lib/supabase'
import OrderCard from './OrderCard'

// Tarjeta colapsable de un refugio. Carga sus pedidos solo al expandir.
export default function ShelterGroup({ resumen, tipoFilter, myLat, myLng,
  onClaim, onDeliver, onRelease, onCancel, busy }) {
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState(null)   // null = aún no cargado
  const [loading, setLoading] = useState(false)

  // Distancia del refugio al proveedor (si hay coords)
  const dist = (myLat != null && resumen.lat != null)
    ? distanceKm(myLat, myLng, resumen.lat, resumen.lng) : null

  async function toggle() {
    const next = !open
    setOpen(next)
    // Cargar pedidos la primera vez que se expande
    if (next && orders === null) {
      await recargar()
    }
  }

  async function recargar() {
    setLoading(true)
    let q = supabase.from('orders')
      .select('*')
      .eq('shelter_id', resumen.shelter_id)
      .in('status', ['pending', 'progress'])
      .order('created_at', { ascending: false })
    if (tipoFilter !== 'todos') q = q.eq('order_type', tipoFilter)
    const { data } = await q
    setOrders(data || [])
    setLoading(false)
  }

  // Conteo visible según el filtro de tipo
  const count = tipoFilter === 'comida' ? resumen.comida_count
    : tipoFilter === 'insumos' ? resumen.insumos_count
    : resumen.total_count

  // Si el filtro deja al refugio en 0, no se muestra
  if (Number(count) === 0) return null

  // Un shelter object mínimo para pasar a OrderCard (fallback de ubicación)
  const shelterObj = {
    id: resumen.shelter_id, name: resumen.name, estado: resumen.estado,
    location: resumen.location, lat: resumen.lat, lng: resumen.lng,
  }

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
          ) : (orders || []).length === 0 ? (
            <div className="muted" style={{ padding: 12 }}>Sin pedidos.</div>
          ) : (
            orders.map(o => (
              <OrderCard key={o.id} order={o} shelter={shelterObj}
                onClaim={onClaim} onDeliver={onDeliver} onRelease={onRelease} onCancel={onCancel} busy={busy}
                onChanged={recargar} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

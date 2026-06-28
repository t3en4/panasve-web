import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, distanceKm } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import OrderCard from '../components/OrderCard'

export default function Orders() {
  const { profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [shelters, setShelters] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [{ data: ord }, { data: shl }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('shelters').select('*'),
    ])
    setOrders(ord || [])
    const map = {}
    ;(shl || []).forEach(s => { map[s.id] = s })
    setShelters(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Realtime: refrescar cuando cambian los pedidos
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load])

  async function claim(order) {
    setBusy(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'progress', claimed_by: profile.id, progress_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'pending') // evita choque si otro lo tomó primero
    setBusy(false)
    if (error) { toast('No se pudo tomar el pedido. Quizá ya fue tomado.', 'error'); load(); return }
    toast('Pedido tomado. ¡Gracias por ayudar, pana!')
  }

  async function deliver(order) {
    setBusy(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'done', done_at: new Date().toISOString() })
      .eq('id', order.id)
    setBusy(false)
    if (error) { toast('No se pudo actualizar.', 'error'); return }
    toast('Pedido marcado como entregado. ¡Excelente trabajo!')
  }

  async function release(order) {
    setBusy(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'pending', claimed_by: null, progress_at: null })
      .eq('id', order.id)
    setBusy(false)
    if (error) { toast('No se pudo liberar.', 'error'); return }
    toast('Pedido liberado y disponible nuevamente.')
  }

  // Filtrado y orden
  let list = [...orders]
  if (profile) {
    // proveedor: oculta los entregados que no son suyos, ordena por cercanía
    list = list.filter(o => o.status !== 'done' || o.claimed_by === profile.id)
    if (profile.lat != null) {
      list.sort((a, b) => {
        const sa = shelters[a.shelter_id], sb = shelters[b.shelter_id]
        const da = sa?.lat != null ? distanceKm(profile.lat, profile.lng, sa.lat, sa.lng) ?? 9999 : 9999
        const db = sb?.lat != null ? distanceKm(profile.lat, profile.lng, sb.lat, sb.lng) ?? 9999 : 9999
        return da - db
      })
    }
  }
  if (filter !== 'all') list = list.filter(o => o.status === filter)

  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    progress: orders.filter(o => o.status === 'progress').length,
    done: orders.filter(o => o.status === 'done').length,
  }

  const filters = [
    ['all', 'Todos'], ['pending', 'Pendientes'], ['progress', 'En progreso'], ['done', 'Entregados'],
  ]

  return (
    <div className="content">
      <div className="section-header">
        <div>
          <div className="section-title">
            {profile ? 'Pedidos cercanos a tu ubicación' : 'Pedidos activos'}
          </div>
          {profile && profile.lat == null && (
            <div className="muted">Agrega tus coordenadas en tu perfil para ordenar por cercanía.</div>
          )}
        </div>
        {!profile && (
          <button className="btn primary" onClick={() => navigate('/nuevo')}>+ Nuevo pedido</button>
        )}
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--warning)' }}>{stats.pending}</div><div className="stat-label">Pendientes</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--accent)' }}>{stats.progress}</div><div className="stat-label">En progreso</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--success)' }}>{stats.done}</div><div className="stat-label">Entregados</div></div>
      </div>

      <div className="filter-row">
        {filters.map(([f, label]) => (
          <button key={f} className={`btn sm ${filter === f ? 'accent' : ''}`} onClick={() => setFilter(f)}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Cargando pedidos…</div>
      ) : list.length === 0 ? (
        <div className="empty-state"><span className="icon">📋</span><p>No hay pedidos que mostrar.</p></div>
      ) : (
        list.map(o => (
          <OrderCard
            key={o.id}
            order={o}
            shelter={shelters[o.shelter_id]}
            onClaim={claim}
            onDeliver={deliver}
            onRelease={release}
            busy={busy}
          />
        ))
      )}
    </div>
  )
}

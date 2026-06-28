import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, distanceKm } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import OrderCard from '../components/OrderCard'

export default function Orders() {
  const { profile, shelter: myShelter, isShelter, isProvider } = useAuth()
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
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load])

  function patchLocal(orderId, changes) {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...changes } : o))
  }

  async function claim(order) {
    const now = new Date().toISOString(); const prev = orders
    patchLocal(order.id, { status: 'progress', claimed_by: profile.id, claimed_by_name: profile.name, progress_at: now })
    setBusy(true)
    const { error } = await supabase.from('orders')
      .update({ status: 'progress', claimed_by: profile.id, claimed_by_name: profile.name, progress_at: now })
      .eq('id', order.id).eq('status', 'pending')
    setBusy(false)
    if (error) { setOrders(prev); toast('No se pudo tomar el pedido. Quizá ya fue tomado.', 'error'); load(); return }
    toast('Pedido tomado. ¡Gracias por ayudar, pana!')
  }

  async function deliver(order) {
    const now = new Date().toISOString(); const prev = orders
    patchLocal(order.id, { status: 'done', done_at: now })
    setBusy(true)
    const { error } = await supabase.from('orders').update({ status: 'done', done_at: now }).eq('id', order.id)
    setBusy(false)
    if (error) { setOrders(prev); toast('No se pudo actualizar.', 'error'); return }
    toast('Pedido marcado como entregado. ¡Excelente trabajo!')
  }

  async function release(order) {
    const prev = orders
    patchLocal(order.id, { status: 'pending', claimed_by: null, claimed_by_name: null, progress_at: null })
    setBusy(true)
    const { error } = await supabase.from('orders')
      .update({ status: 'pending', claimed_by: null, claimed_by_name: null, progress_at: null }).eq('id', order.id)
    setBusy(false)
    if (error) { setOrders(prev); toast('No se pudo liberar.', 'error'); return }
    toast('Pedido liberado y disponible nuevamente.')
  }

  async function cancel(order) {
    if (!window.confirm('¿Seguro que quieres cancelar este pedido?')) return
    const prev = orders
    patchLocal(order.id, { status: 'cancelled' })
    setBusy(true)
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    setBusy(false)
    if (error) { setOrders(prev); toast('No se pudo cancelar.', 'error'); return }
    toast('Pedido cancelado.')
  }

  // Filtrado y orden según rol
  let list = [...orders]
  if (isShelter && myShelter) {
    list = list.filter(o => o.shelter_id === myShelter.id)
  } else if (isProvider) {
    list = list.filter(o => o.status !== 'cancelled')
    list = list.filter(o => o.status !== 'done' || o.claimed_by === profile.id)
    if (profile.lat != null) {
      list.sort((a, b) => {
        const sa = shelters[a.shelter_id], sb = shelters[b.shelter_id]
        const da = sa?.lat != null ? distanceKm(profile.lat, profile.lng, sa.lat, sa.lng) ?? 9999 : 9999
        const db = sb?.lat != null ? distanceKm(profile.lat, profile.lng, sb.lat, sb.lng) ?? 9999 : 9999
        return da - db
      })
    }
  } else {
    // anónimo: solo pendientes
    list = list.filter(o => o.status === 'pending')
  }
  if (filter !== 'all') list = list.filter(o => o.status === filter)

  const base = isShelter && myShelter ? orders.filter(o => o.shelter_id === myShelter.id) : orders
  const stats = {
    pending: base.filter(o => o.status === 'pending').length,
    progress: base.filter(o => o.status === 'progress').length,
    done: base.filter(o => o.status === 'done').length,
  }

  // Stats globales de toda la plataforma (para el hero)
  const global = {
    total: orders.filter(o => o.status !== 'cancelled').length,
    done: orders.filter(o => o.status === 'done').length,
    active: orders.filter(o => o.status === 'pending' || o.status === 'progress').length,
    meals: orders
      .filter(o => o.status === 'done' && o.order_type === 'comida')
      .reduce((sum, o) => sum + (o.people || 0), 0),
  }

  const filters = isShelter
    ? [['all', 'Todos'], ['pending', 'Pendientes'], ['progress', 'En progreso'], ['done', 'Entregados'], ['cancelled', 'Cancelados']]
    : [['all', 'Todos'], ['pending', 'Pendientes'], ['progress', 'En progreso'], ['done', 'Entregados']]

  const title = isShelter ? 'Mis pedidos' : isProvider ? 'Pedidos cercanos a tu ubicación' : 'Pedidos activos'

  return (
    <div className="content">
      {/* Hero con misión + impacto global */}
      <div className="hero">
        <div className="hero-flag" aria-hidden="true">🇻🇪</div>
        <h1 className="hero-title">Una mesa más, una mano más</h1>
        <p className="hero-text">
          PanasVE conecta a refugios y familias afectadas por los terremotos con
          restaurantes, chefs y proveedores dispuestos a ayudar. Cada pedido es comida
          o insumos que llegan a quien los necesita.
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-num">{global.meals.toLocaleString('es-VE')}</div>
            <div className="hero-label">comidas servidas</div>
          </div>
          <div className="hero-stat">
            <div className="hero-num">{global.done.toLocaleString('es-VE')}</div>
            <div className="hero-label">pedidos completados</div>
          </div>
          <div className="hero-stat">
            <div className="hero-num">{global.active.toLocaleString('es-VE')}</div>
            <div className="hero-label">pedidos activos</div>
          </div>
          <div className="hero-stat">
            <div className="hero-num">{global.total.toLocaleString('es-VE')}</div>
            <div className="hero-label">pedidos en total</div>
          </div>
        </div>
        {!profile && (
          <div className="hero-cta">
            <button className="btn primary" onClick={() => navigate('/login')}>Quiero ayudar / Necesito ayuda</button>
          </div>
        )}
      </div>

      <div className="section-header">
        <div>
          <div className="section-title">{title}</div>
          {isProvider && profile.lat == null && (
            <div className="muted">Agrega tus coordenadas en tu perfil para ordenar por cercanía.</div>
          )}
          {!profile && <div className="muted">Inicia sesión para tomar o publicar pedidos.</div>}
        </div>
        {isShelter && <button className="btn primary" onClick={() => navigate('/nuevo')}>+ Nuevo pedido</button>}
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
        <div className="empty-state">
          <span className="icon">📋</span>
          <p>{isShelter ? 'Aún no tienes pedidos. Crea uno nuevo.' : 'No hay pedidos que mostrar.'}</p>
        </div>
      ) : (
        list.map(o => (
          <OrderCard key={o.id} order={o} shelter={shelters[o.shelter_id]}
            onClaim={claim} onDeliver={deliver} onRelease={release} onCancel={cancel} busy={busy} />
        ))
      )}
    </div>
  )
}

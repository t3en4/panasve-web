import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, distanceKm } from '../lib/supabase'
import { ESTADOS } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import OrderCard from '../components/OrderCard'
import OrdersMap from '../components/OrdersMap'
import ShelterGroup from '../components/ShelterGroup'
import Pagination, { usePaged } from '../components/Pagination'
import CountUp from '../components/CountUp'
import { StatusLegend } from '../components/StatusDot'

export default function Orders() {
  const { profile, shelter: myShelter, isShelter, isProvider, isAdmin } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [shelters, setShelters] = useState({})
  const [providers, setProviders] = useState([])
  const [view, setView] = useState('lista')        // lista | mapa
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [tipoFilter, setTipoFilter] = useState('todos')   // todos | comida | insumos
  const [estadoFilter, setEstadoFilter] = useState('all')
  const [resumenRefugios, setResumenRefugios] = useState([])
  const [misPedidos, setMisPedidos] = useState(null)   // null = no cargado aún
  const [misStatus, setMisStatus] = useState('all')     // all | progress | done
  const [counts, setCounts] = useState({ shelters: 0, providers: 0 })
  const [busy, setBusy] = useState(false)

  // El admin gestiona todo desde /admin; la página principal le es redundante.
  useEffect(() => {
    if (isAdmin) navigate('/admin', { replace: true })
  }, [isAdmin, navigate])

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

  // Cargar proveedores (para que los refugios los vean en el mapa)
  useEffect(() => {
    if (!isShelter) return
    supabase.from('profiles').select('name, provider_type, lat, lng, phone, estado').eq('role', 'provider')
      .then(({ data }) => setProviders(data || []))
  }, [isShelter])

  // Cargar los pedidos que el proveedor tomó (en progreso + entregados), diferido
  const cargarMisPedidos = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase.from('orders')
      .select('*')
      .eq('claimed_by', profile.id)
      .in('status', ['progress', 'done'])
      .order('created_at', { ascending: false })
    setMisPedidos(data || [])
  }, [profile?.id])

  // Resumen de refugios con pedidos activos (vista agrupada: solo proveedor)
  useEffect(() => {
    if (!isProvider) return
    supabase.rpc('refugios_con_pedidos_activos').then(({ data }) => {
      setResumenRefugios(data || [])
    })
  }, [isProvider])

  // Conteo de refugios y proveedores registrados (para el hero del home)
  useEffect(() => {
    if (profile) return  // el hero solo lo ven los visitantes
    supabase.rpc('stats_publicos').then(({ data, error }) => {
      if (!error && data) setCounts({ shelters: data.shelters || 0, providers: data.providers || 0 })
    })
  }, [profile])

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
    if (misPedidos !== null) cargarMisPedidos()
  }

  async function deliver(order) {
    const now = new Date().toISOString(); const prev = orders
    patchLocal(order.id, { status: 'done', done_at: now })
    setBusy(true)
    const { error } = await supabase.from('orders').update({ status: 'done', done_at: now }).eq('id', order.id)
    setBusy(false)
    if (error) { setOrders(prev); toast('No se pudo actualizar.', 'error'); return }
    toast('Pedido marcado como entregado. ¡Excelente trabajo!')
    if (misPedidos !== null) cargarMisPedidos()
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
    if (misPedidos !== null) cargarMisPedidos()
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
      const orderLat = (o) => o.lat != null ? o.lat : shelters[o.shelter_id]?.lat
      const orderLng = (o) => o.lng != null ? o.lng : shelters[o.shelter_id]?.lng
      list.sort((a, b) => {
        const la = orderLat(a), lb = orderLat(b)
        const da = la != null ? distanceKm(profile.lat, profile.lng, la, orderLng(a)) ?? 9999 : 9999
        const db = lb != null ? distanceKm(profile.lat, profile.lng, lb, orderLng(b)) ?? 9999 : 9999
        return da - db
      })
    }
  } else {
    // anónimo: solo pendientes
    list = list.filter(o => o.status === 'pending')
  }
  if (filter !== 'all') list = list.filter(o => o.status === filter)
  // Filtro por estado (según el estado del refugio del pedido)
  if (estadoFilter !== 'all') {
    list = list.filter(o => shelters[o.shelter_id]?.estado === estadoFilter)
  }

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
    // Refugios distintos con al menos un pedido activo
    refugiosActivos: new Set(
      orders.filter(o => o.status === 'pending' || o.status === 'progress').map(o => o.shelter_id)
    ).size,
    meals: orders
      .filter(o => o.status === 'done' && o.order_type === 'comida')
      .reduce((sum, o) => sum + (o.people || 0), 0),
  }

  const filters = isShelter
    ? [['all', 'Todos'], ['pending', 'Pendientes'], ['progress', 'En progreso'], ['done', 'Entregados'], ['cancelled', 'Cancelados']]
    : [['all', 'Todos'], ['pending', 'Pendientes'], ['progress', 'En progreso'], ['done', 'Entregados']]

  const agrupado = isProvider   // vista agrupada por refugio (solo proveedores)
  const title = isShelter ? 'Mis pedidos' : isProvider ? 'Pedidos cercanos a tu ubicación' : 'Pedidos activos'

  // Resumen de refugios (agrupado): filtrar por estado/status y ordenar por cercanía
  let resumenList = resumenRefugios
  if (estadoFilter !== 'all') resumenList = resumenList.filter(r => r.estado === estadoFilter)

  // Filtrar refugios según el status seleccionado: solo los que tengan
  // al menos un pedido en ese estado. 'all' = activos (pendiente + progreso).
  if (agrupado) {
    resumenList = resumenList.filter(r => {
      if (filter === 'pending') return Number(r.pending_count) > 0
      if (filter === 'progress') return Number(r.progress_count) > 0
      if (filter === 'done') return Number(r.done_count) > 0
      if (filter === 'cancelled') return false  // no se listan refugios por cancelados aquí
      return Number(r.total_count) > 0          // 'all' = activos
    })
  }

  if (isProvider && profile?.lat != null) {
    resumenList = [...resumenList].sort((a, b) => {
      const da = a.lat != null ? (distanceKm(profile.lat, profile.lng, a.lat, a.lng) ?? 9999) : 9999
      const db = b.lat != null ? (distanceKm(profile.lat, profile.lng, b.lat, b.lng) ?? 9999) : 9999
      return da - db
    })
  }

  // Lista de "mis pedidos" filtrada por status (proveedor)
  const misFiltrados = misPedidos === null ? []
    : (misStatus === 'all' ? misPedidos : misPedidos.filter(o => o.status === misStatus))

  // Paginación (10 por página) para cada listado
  const pagShelter = usePaged(list, 10, `${filter}-${estadoFilter}`)
  const pagGrupos = usePaged(resumenList, 10, `${estadoFilter}-${tipoFilter}`)
  const pagMios = usePaged(misFiltrados, 10, misStatus)

  // Marcadores del mapa según rol
  // Proveedor: ve los pedidos pendientes. Refugio: ve los proveedores.
  const myLat = isProvider ? profile?.lat : myShelter?.lat
  const myLng = isProvider ? profile?.lng : myShelter?.lng

  let mapMarkers = []
  if (isProvider) {
    mapMarkers = orders.filter(o => o.status === 'pending').map(o => {
      const s = shelters[o.shelter_id]
      const lat = o.lat != null ? o.lat : s?.lat
      const lng = o.lng != null ? o.lng : s?.lng
      if (lat == null) return null
      const resumen = o.order_type === 'insumos'
        ? `${(o.items || []).length} insumos` : `${o.people} personas · ${(o.meals || []).join(', ')}`
      return { lat, lng, title: s?.name || 'Refugio', subtitle: resumen }
    }).filter(Boolean)
  } else if (isShelter) {
    mapMarkers = providers.filter(p => p.lat != null).map(p => ({
      lat: p.lat, lng: p.lng, title: p.name,
      subtitle: `${p.provider_type || 'Proveedor'}${p.phone ? ' · ' + p.phone : ''}`,
    }))
  }

  // Marcadores para el mapa del home (visitantes): todos los pedidos, color por estado
  // Terracota = pendiente, ámbar = en progreso, verde = entregado
  const STATUS_COLOR = { pending: '#c2703d', progress: '#d9a213', done: '#3c6e54' }
  const STATUS_TXT = { pending: 'Pendiente', progress: 'En progreso', done: 'Entregado' }
  const homeMarkers = orders
    .filter(o => ['pending', 'progress', 'done'].includes(o.status))
    .map(o => {
      const s = shelters[o.shelter_id]
      const lat = o.lat != null ? o.lat : s?.lat
      const lng = o.lng != null ? o.lng : s?.lng
      if (lat == null) return null
      const resumen = o.order_type === 'insumos'
        ? `${(o.items || []).length} insumos` : `${o.people || ''} personas`
      return {
        lat, lng, color: STATUS_COLOR[o.status],
        title: s?.name || 'Pedido',
        subtitle: `${STATUS_TXT[o.status]} · ${resumen}`,
      }
    }).filter(Boolean)

  return (
    <div className="content">
      {/* Hero solo para visitantes no autenticados — mapa protagonista */}
      {!profile && (
      <div className="hero">
        <div className="hero-head fade-in-up">
          <img src="/logo.png" alt="PanasVE" className="hero-logo" />
          <h1 className="hero-title">Conectamos ayuda con quien la necesita</h1>
          <p className="hero-text">
            PanasVE conecta a refugios y familias afectadas por los terremotos con
            restaurantes, chefs y proveedores dispuestos a ayudar.
          </p>
        </div>

        {global.active > 0 && (
          <button className="hero-alert hero-alert-link fade-in-up delay-1" onClick={() => navigate('/login')}>
            <span className="hero-alert-pulse" aria-hidden="true" />
            <span>
              Hay <strong>{global.refugiosActivos}</strong> {global.refugiosActivos === 1 ? 'refugio esperando' : 'refugios esperando'} ayuda ahora mismo.
              <span className="hero-alert-cta">Inicia sesión o regístrate para ayudar →</span>
            </span>
          </button>
        )}

        {/* Mapa de pedidos — protagonista */}
        {homeMarkers.length > 0 && (
          <div className="hero-map fade-in-up delay-2">
            <div className="hero-map-legend">
              <span><i style={{ background: '#c2703d' }} /> Pendiente</span>
              <span><i style={{ background: '#d9a213' }} /> En progreso</span>
              <span><i style={{ background: '#3c6e54' }} /> Entregado</span>
            </div>
            <OrdersMap markers={homeMarkers} showSelf={false} />
          </div>
        )}

        <div className="hero-stats fade-in-up delay-3">
          {[
            { v: global.refugiosActivos, label: global.refugiosActivos === 1 ? 'refugio necesita ayuda' : 'refugios necesitan ayuda', highlight: true },
            { v: counts.shelters, label: counts.shelters === 1 ? 'refugio registrado' : 'refugios registrados' },
            { v: counts.providers, label: counts.providers === 1 ? 'proveedor registrado' : 'proveedores registrados' },
            { v: global.meals, label: 'comidas servidas' },
            { v: global.done, label: 'pedidos completados' },
          ].filter(s => s.v > 0).map((s, i) => (
            <div className={`hero-stat ${s.highlight ? 'highlight' : ''}`} key={i}>
              <div className="hero-num"><CountUp value={s.v} /></div>
              <div className="hero-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="hero-cta fade-in-up delay-4">
          <button className="btn primary" onClick={() => navigate('/login')}>Quiero ayudar / Necesito ayuda</button>
        </div>
        <a href="https://instagram.com/panasve" target="_blank" rel="noreferrer" className="hero-ig fade-in-up delay-4">Síguenos en Instagram · @panasve</a>
      </div>
      )}

      {profile && (
        <>
          <div className="section-header">
            <div>
              <div className="section-title">{title}</div>
              {isProvider && profile.lat == null && (
                <div className="muted">Agrega tus coordenadas en tu perfil para ordenar por cercanía.</div>
              )}
            </div>
            {isShelter && <button className="btn primary" onClick={() => navigate('/nuevo')}>+ Nuevo pedido</button>}
          </div>

          {/* Pestañas */}
          <div className="view-tabs">
            {isProvider ? (
              <>
                <button className={`view-tab ${view === 'lista' ? 'active' : ''}`} onClick={() => setView('lista')}>☰ Disponibles</button>
                <button className={`view-tab ${view === 'mios' ? 'active' : ''}`}
                  onClick={() => { setView('mios'); if (misPedidos === null) cargarMisPedidos() }}>✓ Mis pedidos</button>
                <button className={`view-tab ${view === 'mapa' ? 'active' : ''}`} onClick={() => setView('mapa')}>📍 Mapa</button>
              </>
            ) : (
              <>
                <button className={`view-tab ${view === 'lista' ? 'active' : ''}`} onClick={() => setView('lista')}>☰ Lista</button>
                <button className={`view-tab ${view === 'mapa' ? 'active' : ''}`} onClick={() => setView('mapa')}>📍 Mapa</button>
              </>
            )}
          </div>

          {view === 'mios' ? (
            <>
              <div className="filter-row">
                {[['all', 'Todos'], ['progress', 'En progreso'], ['done', 'Entregados']].map(([s, label]) => (
                  <button key={s} className={`btn sm ${misStatus === s ? 'accent' : ''}`} onClick={() => setMisStatus(s)}>{label}</button>
                ))}
              </div>
              {misPedidos === null ? (
                <div className="loading">Cargando tus pedidos…</div>
              ) : misFiltrados.length === 0 ? (
                <div className="empty-state">
                  <span className="icon">✓</span>
                  <p>Aún no has tomado pedidos. Revisa los disponibles y toma uno para ayudar.</p>
                </div>
              ) : (
                <>
                  <StatusLegend compact />
                  {pagMios.pageItems.map(o => (
                    <OrderCard key={o.id} order={o} shelter={shelters[o.shelter_id]}
                      onClaim={claim} onDeliver={deliver} onRelease={release} onCancel={cancel} busy={busy} />
                  ))}
                  <Pagination page={pagMios.page} totalPages={pagMios.totalPages} setPage={pagMios.setPage} total={pagMios.total} />
                </>
              )}
            </>
          ) : view === 'mapa' ? (
            <div className="card" style={{ padding: 16 }}>
              <div className="card-sub" style={{ marginBottom: 12 }}>
                {isProvider
                  ? 'Pedidos pendientes en el mapa. El punto azul eres tú.'
                  : 'Proveedores disponibles en el mapa. El punto azul eres tú.'}
              </div>
              <OrdersMap center={{ lat: myLat, lng: myLng }} markers={mapMarkers} />
            </div>
          ) : (
          <>
          <div className="stats-row">
            <div className="stat-card"><div className="stat-num" style={{ color: 'var(--warning)' }}>{stats.pending}</div><div className="stat-label">Pendientes</div></div>
            <div className="stat-card"><div className="stat-num" style={{ color: 'var(--accent)' }}>{stats.progress}</div><div className="stat-label">En progreso</div></div>
            <div className="stat-card"><div className="stat-num" style={{ color: 'var(--success)' }}>{stats.done}</div><div className="stat-label">Entregados</div></div>
          </div>

          <div className="filter-row">
            {filters.map(([f, label]) => (
              <button key={f} className={`btn sm ${filter === f ? 'accent' : ''}`} onClick={() => setFilter(f)}>{label}</button>
            ))}
            {!isShelter && (
              <select className="estado-filter" value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
                <option value="all">Todos los estados</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
          </div>

          {/* Filtro comida / insumos (vista agrupada: proveedor o admin) */}
          {agrupado && (
            <div className="filter-row">
              {[['todos', 'Todos'], ['comida', '🍽️ Comida'], ['insumos', '📦 Insumos']].map(([t, label]) => (
                <button key={t} className={`btn sm ${tipoFilter === t ? 'accent' : ''}`} onClick={() => setTipoFilter(t)}>{label}</button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="loading">Cargando pedidos…</div>
          ) : agrupado ? (
            /* Vista agrupada: refugios colapsables, carga diferida */
            resumenList.length === 0 ? (
              <div className="empty-state">
                <span className="icon">📋</span>
                <p>No hay pedidos activos en este momento.</p>
              </div>
            ) : (
              <>
                <div className="shelter-groups">
                  {pagGrupos.pageItems.map(r => (
                    <ShelterGroup key={r.shelter_id} resumen={r} tipoFilter={tipoFilter} statusFilter={filter}
                      myLat={profile?.lat} myLng={profile?.lng}
                      onClaim={claim} onDeliver={deliver} onRelease={release} onCancel={cancel} busy={busy} />
                  ))}
                </div>
                <Pagination page={pagGrupos.page} totalPages={pagGrupos.totalPages} setPage={pagGrupos.setPage} total={pagGrupos.total} />
              </>
            )
          ) : list.length === 0 ? (
            <div className="empty-state">
              <span className="icon">📋</span>
              <p>{isShelter ? 'Aún no tienes pedidos. Crea uno nuevo.' : 'No hay pedidos que mostrar.'}</p>
            </div>
          ) : (
            <>
              <StatusLegend compact />
              {pagShelter.pageItems.map(o => (
                <OrderCard key={o.id} order={o} shelter={shelters[o.shelter_id]}
                  onClaim={claim} onDeliver={deliver} onRelease={release} onCancel={cancel} busy={busy} />
              ))}
              <Pagination page={pagShelter.page} totalPages={pagShelter.totalPages} setPage={pagShelter.setPage} total={pagShelter.total} />
            </>
          )}
          </>
          )}
        </>
      )}
    </div>
  )
}

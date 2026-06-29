import { useEffect, useState } from 'react'
import { supabase, fmtDate } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { providerTypeLabel, shelterTypeLabel, PROVIDER_TYPES } from '../lib/constants'

export default function Admin() {
  const { isAdmin } = useAuth()
  const [rows, setRows] = useState([])
  const [providers, setProviders] = useState([])
  const [shelters, setShelters] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [tipoFilter, setTipoFilter] = useState('todos')   // todos | comida | insumos
  const [statusFilter, setStatusFilter] = useState('todos')   // todos | pending | progress | done | cancelled

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: p }, { data: s }] = await Promise.all([
        supabase.from('orders_full').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'provider').order('created_at', { ascending: false }),
        supabase.from('shelters').select('*').order('created_at', { ascending: false }),
      ])
      setRows(o || [])
      setProviders(p || [])
      setShelters(s || [])
      setLoading(false)
    }
    load()
  }, [])

  if (!isAdmin) return <div className="content"><div className="empty-state">Acceso solo para administradores.</div></div>

  const statusLabel = { pending: 'Pendiente', progress: 'En progreso', done: 'Entregado', cancelled: 'Cancelado' }

  // ---- Métricas para el dashboard ----
  const now = new Date()
  const hace24h = new Date(now.getTime() - 24 * 3600 * 1000)
  const hace7d = new Date(now.getTime() - 7 * 24 * 3600 * 1000)

  const ordersByStatus = {
    pending: rows.filter(r => r.status === 'pending').length,
    progress: rows.filter(r => r.status === 'progress').length,
    done: rows.filter(r => r.status === 'done').length,
    cancelled: rows.filter(r => r.status === 'cancelled').length,
  }
  const ordersByType = {
    comida: rows.filter(r => r.order_type === 'comida').length,
    insumos: rows.filter(r => r.order_type === 'insumos').length,
  }
  const ordersRecientes = {
    h24: rows.filter(r => new Date(r.created_at) >= hace24h).length,
    d7: rows.filter(r => new Date(r.created_at) >= hace7d).length,
  }
  const cuentasRecientes = {
    refugios24: shelters.filter(s => new Date(s.created_at) >= hace24h).length,
    refugios7: shelters.filter(s => new Date(s.created_at) >= hace7d).length,
    prov24: providers.filter(p => new Date(p.created_at) >= hace24h).length,
    prov7: providers.filter(p => new Date(p.created_at) >= hace7d).length,
  }
  // Proveedores por tipo
  const provPorTipo = {}
  providers.forEach(p => {
    const t = p.provider_type || 'otro'
    provPorTipo[t] = (provPorTipo[t] || 0) + 1
  })
  // Cuentas por estado (refugios + proveedores)
  const porEstado = {}
  shelters.forEach(s => { if (s.estado) { porEstado[s.estado] = porEstado[s.estado] || { ref: 0, prov: 0 }; porEstado[s.estado].ref++ } })
  providers.forEach(p => { if (p.estado) { porEstado[p.estado] = porEstado[p.estado] || { ref: 0, prov: 0 }; porEstado[p.estado].prov++ } })
  const estadosOrdenados = Object.entries(porEstado).sort((a, b) => (b[1].ref + b[1].prov) - (a[1].ref + a[1].prov))

  // Comidas servidas (personas en pedidos de comida entregados)
  const comidasServidas = rows
    .filter(r => r.status === 'done' && r.order_type === 'comida')
    .reduce((sum, r) => sum + (r.people || 0), 0)

  const Stat = ({ num, label, color }) => (
    <div className="dash-card">
      <div className="dash-num" style={color ? { color } : undefined}>{Number(num).toLocaleString('es-VE')}</div>
      <div className="dash-label">{label}</div>
    </div>
  )

  return (
    <div className="content">
      <div className="section-header"><div className="section-title">Panel de administración</div></div>

      <div className="filter-row">
        <button className={`btn sm ${tab === 'dashboard' ? 'accent' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={`btn sm ${tab === 'orders' ? 'accent' : ''}`} onClick={() => setTab('orders')}>Pedidos ({rows.length})</button>
        <button className={`btn sm ${tab === 'providers' ? 'accent' : ''}`} onClick={() => setTab('providers')}>Proveedores ({providers.length})</button>
        <button className={`btn sm ${tab === 'shelters' ? 'accent' : ''}`} onClick={() => setTab('shelters')}>Refugios ({shelters.length})</button>
        <button className={`btn sm ${tab === 'mensajes' ? 'accent' : ''}`} onClick={() => setTab('mensajes')}>Mensajes</button>
      </div>

      {loading ? <div className="loading">Cargando…</div> : tab === 'dashboard' ? (
        <div className="dash">
          {/* Resumen general */}
          <h3 className="dash-h">Resumen general</h3>
          <div className="dash-grid">
            <Stat num={shelters.length} label="Refugios" color="var(--success)" />
            <Stat num={providers.length} label="Proveedores" color="var(--accent)" />
            <Stat num={rows.length} label="Pedidos totales" />
            <Stat num={comidasServidas} label="Comidas servidas" color="var(--accent)" />
          </div>

          {/* Pedidos por estado */}
          <h3 className="dash-h">Pedidos por estado</h3>
          <div className="dash-grid">
            <Stat num={ordersByStatus.pending} label="Pendientes" color="var(--warning)" />
            <Stat num={ordersByStatus.progress} label="En progreso" color="var(--accent)" />
            <Stat num={ordersByStatus.done} label="Entregados" color="var(--success)" />
            <Stat num={ordersByStatus.cancelled} label="Cancelados" color="var(--danger)" />
          </div>

          {/* Pedidos por tipo */}
          <h3 className="dash-h">Pedidos por tipo</h3>
          <div className="dash-grid">
            <Stat num={ordersByType.comida} label="Comida" />
            <Stat num={ordersByType.insumos} label="Insumos" />
          </div>

          {/* Actividad reciente */}
          <h3 className="dash-h">Actividad reciente</h3>
          <div className="dash-grid">
            <Stat num={ordersRecientes.h24} label="Pedidos (24h)" />
            <Stat num={ordersRecientes.d7} label="Pedidos (7 días)" />
            <Stat num={cuentasRecientes.refugios24 + cuentasRecientes.prov24} label="Cuentas nuevas (24h)" />
            <Stat num={cuentasRecientes.refugios7 + cuentasRecientes.prov7} label="Cuentas nuevas (7 días)" />
          </div>

          {/* Proveedores por tipo */}
          <h3 className="dash-h">Proveedores por tipo</h3>
          <div className="dash-bars">
            {Object.entries(provPorTipo).sort((a, b) => b[1] - a[1]).map(([t, n]) => {
              const pct = providers.length ? Math.round(n / providers.length * 100) : 0
              return (
                <div className="dash-bar-row" key={t}>
                  <div className="dash-bar-label">{providerTypeLabel(t)}</div>
                  <div className="dash-bar-track"><div className="dash-bar-fill" style={{ width: `${pct}%` }} /></div>
                  <div className="dash-bar-val">{n}</div>
                </div>
              )
            })}
            {providers.length === 0 && <div className="muted">Sin proveedores aún.</div>}
          </div>

          {/* Cuentas por estado */}
          <h3 className="dash-h">Cuentas por estado</h3>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Estado</th><th>Refugios</th><th>Proveedores</th><th>Total</th></tr></thead>
              <tbody>
                {estadosOrdenados.map(([est, v]) => (
                  <tr key={est}><td>{est}</td><td>{v.ref}</td><td>{v.prov}</td><td><b>{v.ref + v.prov}</b></td></tr>
                ))}
                {estadosOrdenados.length === 0 && <tr><td colSpan="4" className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin datos de estado aún.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'orders' ? (
        <>
          <div className="filter-row" style={{ marginBottom: 10 }}>
            {[['todos', 'Todos'], ['comida', '🍽️ Comida'], ['insumos', '📦 Insumos']].map(([t, label]) => (
              <button key={t} className={`btn sm ${tipoFilter === t ? 'accent' : ''}`} onClick={() => setTipoFilter(t)}>{label}</button>
            ))}
          </div>
          <div className="filter-row" style={{ marginBottom: 14 }}>
            {[['todos', 'Todos'], ['pending', 'Pendientes'], ['progress', 'En progreso'], ['done', 'Entregados'], ['cancelled', 'Cancelados']].map(([s, label]) => (
              <button key={s} className={`btn sm ${statusFilter === s ? 'accent' : ''}`} onClick={() => setStatusFilter(s)}>{label}</button>
            ))}
          </div>
          <AdminOrdersGrouped rows={rows} tipoFilter={tipoFilter} statusFilter={statusFilter} statusLabel={statusLabel} />
        </>
      ) : tab === 'providers' ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Email</th><th>Teléfono</th><th>Instagram</th><th>Registrado</th></tr>
            </thead>
            <tbody>
              {providers.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td><td>{providerTypeLabel(p.provider_type)}</td><td>{p.estado || '—'}</td>
                  <td>{p.email}</td><td>{p.phone || '—'}</td><td>{p.instagram || '—'}</td>
                  <td className="muted">{fmtDate(p.created_at)}</td>
                </tr>
              ))}
              {providers.length === 0 && <tr><td colSpan="7" className="muted" style={{ textAlign: 'center', padding: 30 }}>Sin proveedores aún.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : tab === 'shelters' ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Refugio</th><th>Tipo</th><th>Estado</th><th>Ubicación</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Registrado</th></tr>
            </thead>
            <tbody>
              {shelters.map(s => (
                <tr key={s.id}>
                  <td>{s.name}</td><td>{shelterTypeLabel(s.shelter_type)}</td><td>{s.estado || '—'}</td><td>{s.location || '—'}</td>
                  <td>{s.contact || '—'}</td><td>{s.phone || '—'}</td><td>{s.email || '—'}</td>
                  <td className="muted">{fmtDate(s.created_at)}</td>
                </tr>
              ))}
              {shelters.length === 0 && <tr><td colSpan="8" className="muted" style={{ textAlign: 'center', padding: 30 }}>Sin refugios aún.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && tab === 'mensajes' && (
        <MensajePanel shelters={shelters} providers={providers} />
      )}
    </div>
  )
}

function AdminOrdersGrouped({ rows, tipoFilter, statusFilter, statusLabel }) {
  // Filtrar por tipo y status, luego agrupar por refugio
  const filtradas = rows.filter(r =>
    (tipoFilter === 'todos' || r.order_type === tipoFilter) &&
    (statusFilter === 'todos' || r.status === statusFilter)
  )

  // Agrupar por shelter
  const grupos = {}
  for (const r of filtradas) {
    const key = r.shelter_id || r.shelter_name || 'sin-refugio'
    if (!grupos[key]) {
      grupos[key] = { name: r.shelter_name || 'Sin refugio', estado: r.shelter_estado || r.shelter_location, orders: [] }
    }
    grupos[key].orders.push(r)
  }
  const lista = Object.values(grupos).sort((a, b) => (b.orders.length - a.orders.length))

  if (lista.length === 0) {
    return <div className="empty-state"><span className="icon">📋</span><p>Sin pedidos.</p></div>
  }

  return (
    <div className="shelter-groups">
      {lista.map((g, i) => (
        <AdminShelterRow key={i} grupo={g} statusLabel={statusLabel} />
      ))}
    </div>
  )
}

function AdminShelterRow({ grupo, statusLabel }) {
  const [open, setOpen] = useState(false)
  const toast = useToast()

  async function compartirPedido(id, nombre) {
    const url = `${window.location.origin}/pedido/${id}`
    const titulo = `Pedido en PanasVE — ${nombre || ''}`.trim()
    if (navigator.share) {
      try { await navigator.share({ title: titulo, url }); return } catch { /* cancelado */ }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast('Enlace copiado. ¡Compártelo con quien pueda ayudar!', 'success')
    } catch {
      toast('Copia este enlace: ' + url)
    }
  }

  return (
    <div className={`shelter-group ${open ? 'open' : ''}`}>
      <button className="shelter-group-head" onClick={() => setOpen(o => !o)}>
        <span className="shelter-group-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="shelter-group-info">
          <span className="shelter-group-name">{grupo.name}</span>
          <span className="shelter-group-meta">{grupo.estado || 's/e'}</span>
        </span>
        <span className="shelter-group-count">{grupo.orders.length} {grupo.orders.length === 1 ? 'pedido' : 'pedidos'}</span>
      </button>
      {open && (
        <div className="shelter-group-body">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Estado</th><th>Tipo</th><th>Detalle</th><th>Proveedor</th><th>Creado</th><th>Entregado</th><th>Compartir</th></tr>
              </thead>
              <tbody>
                {grupo.orders.map(r => (
                  <tr key={r.id}>
                    <td><span className={`badge ${r.status}`}>{statusLabel[r.status]}</span></td>
                    <td>{r.order_type === 'insumos' ? '📦 Insumos' : '🍽️ Comida'}</td>
                    <td>{r.order_type === 'insumos' ? `${(r.items || []).length} insumos` : `${r.people} pers. · ${(r.meals || []).join(', ')}`}</td>
                    <td>{r.provider_name || '—'}</td>
                    <td className="muted">{fmtDate(r.created_at)}</td>
                    <td className="muted">{r.done_at ? fmtDate(r.done_at) : '—'}</td>
                    <td><button className="btn sm" onClick={() => compartirPedido(r.id, r.shelter_name)}>🔗</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function MensajePanel({ shelters, providers }) {
  const toast = useToast()
  const [modo, setModo] = useState('uno')   // uno | varios
  const [tipo, setTipo] = useState('todos')
  const [dest, setDest] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [historial, setHistorial] = useState([])
  const [histRango, setHistRango] = useState('todos')   // hoy | 7d | 30d | todos
  // Envío masivo
  const [audience, setAudience] = useState('proveedores')   // todos | refugios | proveedores | proveedor_tipo
  const [provTipo, setProvTipo] = useState('restaurante')

  // Cargar historial de mensajes enviados
  async function cargarHistorial() {
    const { data } = await supabase.from('admin_messages')
      .select('*').order('created_at', { ascending: false }).limit(50)
    setHistorial(data || [])
  }
  useEffect(() => { cargarHistorial() }, [])

  // Listas por tipo
  const listaRefugios = shelters.filter(s => s.email)
    .map(s => ({ email: s.email, label: `${s.name} · ${s.estado || 's/e'}` }))
  const listaProveedores = providers.filter(p => p.email)
    .map(p => ({ email: p.email, label: `${p.name} · ${p.estado || 's/e'}` }))

  // Destinatarios según el tipo elegido
  let usuarios = []
  if (tipo === 'refugios') usuarios = listaRefugios
  else if (tipo === 'proveedores') usuarios = listaProveedores
  else usuarios = [...listaRefugios, ...listaProveedores]
  usuarios = usuarios.sort((a, b) => a.label.localeCompare(b.label))

  function cambiarTipo(t) { setTipo(t); setDest('') }

  async function enviar() {
    if (!dest || !subject.trim() || !body.trim()) { toast('Completa destinatario, asunto y mensaje.', 'error'); return }
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-message', {
        body: { to_email: dest, subject: subject.trim(), body: body.trim() },
      })
      if (error || data?.error) { toast(data?.error || 'No se pudo enviar.', 'error') }
      else {
        toast('Mensaje enviado.', 'success'); setSubject(''); setBody(''); setDest('')
        cargarHistorial()
      }
    } catch {
      toast('No se pudo enviar.', 'error')
    }
    setBusy(false)
  }

  // Cuántos recibirán el envío masivo, según la audiencia
  const conEmail = (arr) => arr.filter(x => x.email)
  let totalMasivo = 0
  if (audience === 'todos') totalMasivo = conEmail(shelters).length + conEmail(providers).length
  else if (audience === 'refugios') totalMasivo = conEmail(shelters).length
  else if (audience === 'proveedores') totalMasivo = conEmail(providers).length
  else if (audience === 'proveedor_tipo') totalMasivo = conEmail(providers).filter(p => p.provider_type === provTipo).length

  async function enviarMasivo() {
    if (!subject.trim() || !body.trim()) { toast('Completa asunto y mensaje.', 'error'); return }
    if (totalMasivo === 0) { toast('No hay destinatarios para esa selección.', 'error'); return }
    if (!window.confirm(`Vas a enviar este mensaje a ${totalMasivo} ${totalMasivo === 1 ? 'persona' : 'personas'}. ¿Continuar?`)) return
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-broadcast', {
        body: { audience, provider_type: provTipo, subject: subject.trim(), body: body.trim() },
      })
      if (error || data?.error) { toast(data?.error || 'No se pudo enviar.', 'error') }
      else {
        toast(`Enviado a ${data.enviados} de ${data.total}.`, 'success')
        setSubject(''); setBody(''); cargarHistorial()
      }
    } catch {
      toast('No se pudo enviar.', 'error')
    }
    setBusy(false)
  }

  // Historial filtrado por rango de fecha
  const ahora = Date.now()
  const histFiltrado = historial.filter(m => {
    if (histRango === 'todos') return true
    const t = new Date(m.created_at).getTime()
    if (histRango === 'hoy') return (ahora - t) < 24 * 3600 * 1000
    if (histRango === '7d') return (ahora - t) < 7 * 24 * 3600 * 1000
    if (histRango === '30d') return (ahora - t) < 30 * 24 * 3600 * 1000
    return true
  })

  return (
    <>
      <div className="card" style={{ maxWidth: 620 }}>
        <div className="card-title" style={{ marginBottom: 4 }}>Enviar mensaje</div>
        <div className="card-sub" style={{ marginBottom: 16 }}>El mensaje llega por correo, con el logo y formato de PanasVE.</div>

        {/* Modo: a uno o a varios */}
        <div className="filter-row" style={{ marginBottom: 16 }}>
          <button className={`btn sm ${modo === 'uno' ? 'accent' : ''}`} onClick={() => setModo('uno')}>A un usuario</button>
          <button className={`btn sm ${modo === 'varios' ? 'accent' : ''}`} onClick={() => setModo('varios')}>A varios (masivo)</button>
        </div>

        <div className="msg-form">
          {modo === 'uno' ? (
            <div className="msg-row">
              <div className="field"><label>Tipo de usuario</label>
                <select value={tipo} onChange={e => cambiarTipo(e.target.value)}>
                  <option value="todos">Todos</option>
                  <option value="refugios">Refugios</option>
                  <option value="proveedores">Proveedores</option>
                </select>
              </div>
              <div className="field"><label>Destinatario <span className="req">*</span></label>
                <select value={dest} onChange={e => setDest(e.target.value)}>
                  <option value="">Selecciona un usuario…</option>
                  {usuarios.map((u, i) => <option key={i} value={u.email}>{u.label}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="msg-row">
              <div className="field"><label>Enviar a</label>
                <select value={audience} onChange={e => setAudience(e.target.value)}>
                  <option value="proveedores">Todos los proveedores</option>
                  <option value="refugios">Todos los refugios</option>
                  <option value="todos">Todos (refugios + proveedores)</option>
                  <option value="proveedor_tipo">Proveedores por tipo…</option>
                </select>
              </div>
              {audience === 'proveedor_tipo' && (
                <div className="field"><label>Tipo de proveedor</label>
                  <select value={provTipo} onChange={e => setProvTipo(e.target.value)}>
                    {PROVIDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
          <div className="field"><label>Asunto <span className="req">*</span></label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ej: Actualización sobre tu pedido" /></div>
          <div className="field"><label>Mensaje <span className="req">*</span></label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={7} placeholder="Escribe tu mensaje aquí…" style={{ minHeight: 140 }} /></div>
        </div>

        {modo === 'uno' ? (
          <button className="btn primary" style={{ marginTop: 14 }} onClick={enviar} disabled={busy}>
            {busy ? 'Enviando…' : 'Enviar mensaje'}
          </button>
        ) : (
          <div style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={enviarMasivo} disabled={busy}>
              {busy ? 'Enviando…' : `Enviar a ${totalMasivo} ${totalMasivo === 1 ? 'persona' : 'personas'}`}
            </button>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
              Se enviará un correo individual a cada destinatario. Las respuestas llegan a panass.venezuela@gmail.com.
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 620 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Historial de mensajes</div>
        <div className="filter-row" style={{ marginBottom: 14 }}>
          {[['hoy', 'Hoy'], ['7d', '7 días'], ['30d', '30 días'], ['todos', 'Todos']].map(([r, label]) => (
            <button key={r} className={`btn sm ${histRango === r ? 'accent' : ''}`} onClick={() => setHistRango(r)}>{label}</button>
          ))}
        </div>
        {histFiltrado.length === 0 ? (
          <div className="muted" style={{ fontSize: 14 }}>
            {historial.length === 0 ? 'Aún no has enviado mensajes.' : 'No hay mensajes en este rango.'}
          </div>
        ) : (
          <div className="msg-history">
            {histFiltrado.map(m => (
              <MensajeHistItem key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function MensajeHistItem({ m }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`msg-history-item ${open ? 'open' : ''}`}>
      <button className="msg-history-head-btn" onClick={() => setOpen(o => !o)}>
        <span className="msg-history-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="msg-history-summary">
          <span className="msg-history-subject">{m.subject}</span>
          <span className="msg-history-to">{m.to_email}</span>
        </span>
        <span className="msg-history-date">{fmtDate(m.created_at)}</span>
      </button>
      {open && (
        <div className="msg-history-detail">
          <div className="msg-history-body">{m.body}</div>
          {m.sent_by_email && <div className="msg-history-by">Enviado por {m.sent_by_email}</div>}
        </div>
      )}
    </div>
  )
}

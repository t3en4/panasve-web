import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, fmtDate } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Pagination, { usePaged } from '../components/Pagination'
import { StatusDot, StatusLegend } from '../components/StatusDot'
import { providerTypeLabel, shelterTypeLabel, PROVIDER_TYPES } from '../lib/constants'

export default function Admin() {
  const { isAdmin, setPreviewUser } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [providers, setProviders] = useState([])
  const [shelters, setShelters] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [tipoFilter, setTipoFilter] = useState('todos')   // todos | comida | insumos
  const [statusFilter, setStatusFilter] = useState('todos')   // todos | pending | progress | done | cancelled

  const load = useCallback(async () => {
    const [{ data: o }, { data: p }, { data: s }] = await Promise.all([
      supabase.from('orders_full').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'provider').order('created_at', { ascending: false }),
      supabase.from('shelters').select('*').order('created_at', { ascending: false }),
    ])
    setRows(o || [])
    setProviders(p || [])
    setShelters(s || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Paginación de tablas (10 por página)
  const pagProv = usePaged(providers, 10, 'prov')
  const pagShel = usePaged(shelters, 10, 'shel')

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
        <button className={`btn sm ${tab === 'shelters' ? 'accent' : ''}`} onClick={() => setTab('shelters')}>Solicitantes ({shelters.length})</button>
        <button className={`btn sm ${tab === 'mensajes' ? 'accent' : ''}`} onClick={() => setTab('mensajes')}>Mensajes</button>
      </div>

      {loading ? <div className="loading">Cargando…</div> : tab === 'dashboard' ? (
        <div className="dash">
          {/* Resumen general */}
          <h3 className="dash-h">Resumen general</h3>
          <div className="dash-grid">
            <Stat num={shelters.length} label="Solicitantes" color="var(--success)" />
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
              <thead><tr><th>Estado</th><th>Solicitantes</th><th>Proveedores</th><th>Total</th></tr></thead>
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
            {[['todos', 'Todos'], ['comida', '🍽️ Comida'], ['insumos', '📦 Insumos'], ['voluntarios', '🙋 Voluntarios']].map(([t, label]) => (
              <button key={t} className={`btn sm ${tipoFilter === t ? 'accent' : ''}`} onClick={() => setTipoFilter(t)}>{label}</button>
            ))}
          </div>
          <div className="filter-row" style={{ marginBottom: 14 }}>
            {[['todos', 'Todos'], ['pending', 'Pendientes'], ['progress', 'En progreso'], ['done', 'Entregados'], ['cancelled', 'Cancelados']].map(([s, label]) => (
              <button key={s} className={`btn sm ${statusFilter === s ? 'accent' : ''}`} onClick={() => setStatusFilter(s)}>{label}</button>
            ))}
          </div>
          <AdminOrdersGrouped rows={rows} providers={providers} shelters={shelters} tipoFilter={tipoFilter} statusFilter={statusFilter} statusLabel={statusLabel} onChange={load} />
        </>
      ) : tab === 'providers' ? (
        <>
          <div className="acct-list">
            {pagProv.pageItems.map(p => (
              <div className="acct-row" key={p.id}>
                <div className="acct-main">
                  <div className="acct-name">{p.name} <span className="acct-tag">{providerTypeLabel(p.provider_type)}</span></div>
                  <div className="acct-meta">
                    <span>📍 {p.estado || '—'}</span>
                    <span>✉️ {p.email}</span>
                    {p.phone && <span>📞 {p.phone}</span>}
                    {p.instagram && <span>📷 {p.instagram}</span>}
                    <span className="muted">{fmtDate(p.created_at)}</span>
                  </div>
                </div>
                <button className="btn xs acct-view" title="Ver la app como esta cuenta" onClick={() => { setPreviewUser(p.id); navigate('/') }}>👁️ Ver como</button>
              </div>
            ))}
            {providers.length === 0 && <div className="muted" style={{ textAlign: 'center', padding: 30 }}>Sin proveedores aún.</div>}
          </div>
          <Pagination page={pagProv.page} totalPages={pagProv.totalPages} setPage={pagProv.setPage} total={pagProv.total} />
        </>
      ) : tab === 'shelters' ? (
        <>
          <div className="acct-list">
            {pagShel.pageItems.map(s => (
              <div className="acct-row" key={s.id}>
                <div className="acct-main">
                  <div className="acct-name">{s.name} <span className="acct-tag">{shelterTypeLabel(s.shelter_type)}</span></div>
                  <div className="acct-meta">
                    <span>📍 {s.estado || '—'}{s.location ? ` · ${s.location}` : ''}</span>
                    {s.contact && <span>👤 {s.contact}</span>}
                    {s.phone && <span>📞 {s.phone}</span>}
                    {s.email && <span>✉️ {s.email}</span>}
                    <span className="muted">{fmtDate(s.created_at)}</span>
                  </div>
                </div>
                {s.owner_id && <button className="btn xs acct-view" title="Ver la app como esta cuenta" onClick={() => { setPreviewUser(s.owner_id); navigate('/') }}>👁️ Ver como</button>}
              </div>
            ))}
            {shelters.length === 0 && <div className="muted" style={{ textAlign: 'center', padding: 30 }}>Sin solicitantes aún.</div>}
          </div>
          <Pagination page={pagShel.page} totalPages={pagShel.totalPages} setPage={pagShel.setPage} total={pagShel.total} />
        </>
      ) : null}

      {!loading && tab === 'mensajes' && (
        <MensajePanel shelters={shelters} providers={providers} />
      )}
    </div>
  )
}

function AdminOrdersGrouped({ rows, providers, shelters, tipoFilter, statusFilter, statusLabel, onChange }) {
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
      grupos[key] = { shelter_id: r.shelter_id, name: r.shelter_name || 'Sin solicitante', estado: r.shelter_estado || r.shelter_location, orders: [] }
    }
    grupos[key].orders.push(r)
  }
  const lista = Object.values(grupos).sort((a, b) => (b.orders.length - a.orders.length))

  const pag = usePaged(lista, 10, `${tipoFilter}-${statusFilter}`)

  if (lista.length === 0) {
    return <div className="empty-state"><span className="icon">📋</span><p>Sin pedidos.</p></div>
  }

  return (
    <>
      <div className="shelter-groups">
        {pag.pageItems.map((g, i) => (
          <AdminShelterRow key={i} grupo={g} statusLabel={statusLabel} providers={providers}
            shelterObj={(shelters || []).find(s => s.id === g.shelter_id)} onChange={onChange} />
        ))}
      </div>
      <Pagination page={pag.page} totalPages={pag.totalPages} setPage={pag.setPage} total={pag.total} />
    </>
  )
}

function AdminShelterRow({ grupo, statusLabel, providers, shelterObj, onChange }) {
  const [open, setOpen] = useState(false)
  const toast = useToast()

  async function compartirPedido(id) {
    const url = `${window.location.origin}/pedido/${id}`
    try {
      await navigator.clipboard.writeText(url)
      toast('Enlace copiado. ¡Compártelo con quien pueda ayudar!', 'success')
    } catch {
      toast('Copia este enlace: ' + url)
    }
  }

  const mapsUrl = (shelterObj?.lat != null && shelterObj?.lng != null)
    ? `https://www.google.com/maps/search/?api=1&query=${shelterObj.lat},${shelterObj.lng}` : null

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
          {/* Info compartida del refugio (una sola vez) */}
          <div className="sg-shared">
            <div className="sg-shared-grid">
              <div><span className="label">Contacto:</span> {shelterObj?.contact || '—'}</div>
              <div><span className="label">Teléfono:</span> {shelterObj?.phone || '—'}</div>
              {(shelterObj?.location) && (
                <div className="sg-shared-full"><span className="label">Ubicación:</span> {shelterObj.location}</div>
              )}
              {shelterObj?.instagram && <div><span className="label">Instagram:</span> {shelterObj.instagram}</div>}
            </div>
            {mapsUrl && <a className="sg-shared-map" href={mapsUrl} target="_blank" rel="noreferrer">📍 Ver en mapa</a>}
            <StatusLegend />
          </div>

          {/* Una línea por item */}
          <div className="sg-items">
            {grupo.orders.map(r => (
              <AdminOrderManageRow key={r.id} r={r} statusLabel={statusLabel} providers={providers}
                onChange={onChange} onShare={() => compartirPedido(r.id)} toast={toast} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AdminOrderManageRow({ r, statusLabel, providers, onChange, onShare, toast }) {
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState(r.status)
  const [provId, setProvId] = useState(r.claimed_by || '')
  const [busy, setBusy] = useState(false)

  const isInsumos = r.order_type === 'insumos'
  const esVol = r.order_type === 'voluntarios'
  const label = isInsumos
    ? (r.items?.[0]?.name || '1 insumo')
    : esVol
    ? `Voluntarios · ${r.people}${r.purpose ? ` — ${r.purpose}` : ''}`
    : `Comida · ${r.people} personas${(r.meals || []).length ? ` (${(r.meals || []).join(', ')})` : ''}`
  const qty = isInsumos ? r.items?.[0]?.qty : null

  async function guardar() {
    setBusy(true)
    const prov = providers.find(p => p.id === provId)
    const patch = { status }
    if (provId) {
      patch.claimed_by = provId
      patch.claimed_by_name = prov?.name || null
      if (status === 'pending') patch.status = 'progress'
    } else {
      patch.claimed_by = null
      patch.claimed_by_name = null
    }
    if (patch.status === 'done' && !r.done_at) patch.done_at = new Date().toISOString()
    if (patch.status === 'progress' && !r.progress_at) patch.progress_at = new Date().toISOString()

    const { error } = await supabase.from('orders').update(patch).eq('id', r.id)
    setBusy(false)
    if (error) { toast('No se pudo actualizar el pedido.', 'error'); return }
    toast('Pedido actualizado.', 'success')
    setEditing(false)
    onChange && onChange()
  }

  return (
    <div className="sg-item">
      <div className="sg-item-main">
        <StatusDot status={r.status} />
        <span className="sg-item-name">
          {label}
          {qty ? <span className="muted" style={{ marginLeft: 6 }}>· {qty}</span> : null}
        </span>
        <span className="sg-item-actions">
          {r.provider_name && <span className="admin-order-prov">{r.provider_name}</span>}
          <button className="btn xs" onClick={onShare} title="Compartir">🔗</button>
          <button className="btn xs primary" onClick={() => setEditing(e => !e)}>{editing ? 'Cerrar' : 'Gestionar'}</button>
        </span>
      </div>

      {editing && (
        <div className="admin-order-edit">
          <div className="field">
            <label>Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pending">Pendiente</option>
              <option value="progress">En progreso</option>
              <option value="done">Entregado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div className="field">
            <label>Proveedor asignado</label>
            <select value={provId} onChange={e => setProvId(e.target.value)}>
              <option value="">— Sin proveedor —</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.estado || 's/e'})</option>)}
            </select>
          </div>
          <button className="btn sm primary" onClick={guardar} disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      )}
    </div>
  )
}

function MensajePanel({ shelters, providers }) {
  const toast = useToast()
  const [modo, setModo] = useState('uno')   // uno | varios | externos
  const [tipo, setTipo] = useState('todos')
  const [dest, setDest] = useState('')
  const [extEmails, setExtEmails] = useState('')   // correos externos pegados
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

  // Correos externos: parsear la lista pegada (separada por coma, espacio o salto de línea)
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const extLista = extEmails.split(/[\s,;]+/).map(e => e.trim()).filter(Boolean)
  const extValidos = [...new Set(extLista.filter(e => EMAIL_RE.test(e)))]
  const extInvalidos = extLista.filter(e => !EMAIL_RE.test(e))

  async function enviarExternos() {
    if (!subject.trim() || !body.trim()) { toast('Completa asunto y mensaje.', 'error'); return }
    if (extValidos.length === 0) { toast('Ingresa al menos un correo válido.', 'error'); return }
    if (extInvalidos.length > 0 && !window.confirm(`Hay ${extInvalidos.length} correo(s) con formato inválido que se omitirán:\n${extInvalidos.join(', ')}\n\n¿Continuar con los ${extValidos.length} válidos?`)) return
    if (!window.confirm(`Vas a enviar este mensaje a ${extValidos.length} correo(s) externo(s). ¿Continuar?`)) return
    setBusy(true)
    let ok = 0, fail = 0
    for (const email of extValidos) {
      try {
        const { data, error } = await supabase.functions.invoke('admin-message', {
          body: { to_email: email, subject: subject.trim(), body: body.trim() },
        })
        if (error || data?.error) fail++; else ok++
      } catch { fail++ }
    }
    setBusy(false)
    if (ok > 0) { toast(`Enviado a ${ok} correo(s)${fail ? `, ${fail} fallaron` : ''}.`, fail ? 'error' : 'success'); setSubject(''); setBody(''); setExtEmails(''); cargarHistorial() }
    else toast('No se pudo enviar a ningún correo.', 'error')
  }

  async function enviarMasivo() {    if (!subject.trim() || !body.trim()) { toast('Completa asunto y mensaje.', 'error'); return }
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
  const pagHist = usePaged(histFiltrado, 10, histRango)

  return (
    <>
      <div className="card" style={{ maxWidth: 620 }}>
        <div className="card-title" style={{ marginBottom: 4 }}>Enviar mensaje</div>
        <div className="card-sub" style={{ marginBottom: 16 }}>El mensaje llega por correo, con el logo y formato de PanasVE.</div>

        {/* Modo: a uno o a varios */}
        <div className="filter-row" style={{ marginBottom: 16 }}>
          <button className={`btn sm ${modo === 'uno' ? 'accent' : ''}`} onClick={() => setModo('uno')}>A un usuario</button>
          <button className={`btn sm ${modo === 'varios' ? 'accent' : ''}`} onClick={() => setModo('varios')}>A varios (masivo)</button>
          <button className={`btn sm ${modo === 'externos' ? 'accent' : ''}`} onClick={() => setModo('externos')}>A correos externos</button>
        </div>

        <div className="msg-form">
          {modo === 'uno' && (
            <div className="msg-row">
              <div className="field"><label>Tipo de usuario</label>
                <select value={tipo} onChange={e => cambiarTipo(e.target.value)}>
                  <option value="todos">Todos</option>
                  <option value="refugios">Solicitantes</option>
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
          )}
          {modo === 'varios' && (
            <div className="msg-row">
              <div className="field"><label>Enviar a</label>
                <select value={audience} onChange={e => setAudience(e.target.value)}>
                  <option value="proveedores">Todos los proveedores</option>
                  <option value="refugios">Todos los solicitantes</option>
                  <option value="todos">Todos (solicitantes + proveedores)</option>
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
          {modo === 'externos' && (
            <div className="field"><label>Correos externos <span className="req">*</span></label>
              <textarea value={extEmails} onChange={e => setExtEmails(e.target.value)} rows={3}
                placeholder="Pega uno o varios correos, separados por coma, espacio o salto de línea&#10;ej: solicitante@ejemplo.com, chef@ejemplo.com" />
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {extValidos.length > 0 && <span style={{ color: 'var(--success)' }}>{extValidos.length} correo(s) válido(s). </span>}
                {extInvalidos.length > 0 && <span style={{ color: 'var(--danger)' }}>{extInvalidos.length} con formato inválido (se omiten). </span>}
                No hace falta que estén registrados en PanasVE.
              </div>
            </div>
          )}
          <div className="field"><label>Asunto <span className="req">*</span></label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ej: Actualización sobre tu pedido" /></div>
          <div className="field"><label>Mensaje <span className="req">*</span></label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={7} placeholder="Escribe tu mensaje aquí…" style={{ minHeight: 140 }} /></div>
        </div>

        {modo === 'uno' && (
          <button className="btn primary" style={{ marginTop: 14 }} onClick={enviar} disabled={busy}>
            {busy ? 'Enviando…' : 'Enviar mensaje'}
          </button>
        )}
        {modo === 'externos' && (
          <div style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={enviarExternos} disabled={busy}>
              {busy ? 'Enviando…' : `Enviar a ${extValidos.length} correo(s) externo(s)`}
            </button>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
              Se enviará un correo individual a cada dirección, con el formato de PanasVE. Las respuestas llegan a panass.venezuela@gmail.com.
            </div>
          </div>
        )}
        {modo === 'varios' && (
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
            {pagHist.pageItems.map(m => (
              <MensajeHistItem key={m.id} m={m} />
            ))}
            <Pagination page={pagHist.page} totalPages={pagHist.totalPages} setPage={pagHist.setPage} total={pagHist.total} />
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

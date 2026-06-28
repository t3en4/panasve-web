import { useEffect, useState } from 'react'
import { supabase, fmtDate } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Admin() {
  const { isAdmin } = useAuth()
  const [rows, setRows] = useState([])
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('orders')

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: p }] = await Promise.all([
        supabase.from('orders_full').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'provider').order('created_at', { ascending: false }),
      ])
      setRows(o || [])
      setProviders(p || [])
      setLoading(false)
    }
    load()
  }, [])

  if (!isAdmin) return <div className="content"><div className="empty-state">Acceso solo para administradores.</div></div>

  const statusLabel = { pending: 'Pendiente', progress: 'En progreso', done: 'Entregado' }

  return (
    <div className="content">
      <div className="section-header"><div className="section-title">Panel de administración</div></div>

      <div className="filter-row">
        <button className={`btn sm ${tab === 'orders' ? 'accent' : ''}`} onClick={() => setTab('orders')}>Pedidos ({rows.length})</button>
        <button className={`btn sm ${tab === 'providers' ? 'accent' : ''}`} onClick={() => setTab('providers')}>Proveedores ({providers.length})</button>
      </div>

      {loading ? <div className="loading">Cargando…</div> : tab === 'orders' ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Estado</th><th>Refugio</th><th>Personas</th><th>Comidas</th>
                <th>Proveedor</th><th>Creado</th><th>Entregado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td><span className={`badge ${r.status}`}>{statusLabel[r.status]}</span></td>
                  <td>{r.shelter_name}<br /><span className="muted">{r.shelter_location}</span></td>
                  <td>{r.people}</td>
                  <td>{(r.meals || []).join(', ')}</td>
                  <td>{r.provider_name || '—'}</td>
                  <td className="muted">{fmtDate(r.created_at)}</td>
                  <td className="muted">{r.done_at ? fmtDate(r.done_at) : '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="7" className="muted" style={{ textAlign: 'center', padding: 30 }}>Sin pedidos aún.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Dirección</th><th>Instagram</th><th>Registrado</th></tr>
            </thead>
            <tbody>
              {providers.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td><td>{p.email}</td><td>{p.phone || '—'}</td>
                  <td>{p.address || '—'}</td><td>{p.instagram || '—'}</td>
                  <td className="muted">{fmtDate(p.created_at)}</td>
                </tr>
              ))}
              {providers.length === 0 && <tr><td colSpan="6" className="muted" style={{ textAlign: 'center', padding: 30 }}>Sin proveedores aún.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

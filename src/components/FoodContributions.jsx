import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

// Progreso de aportes de un pedido de comida.
// Separa "comprometido" (aporte registrado) de "entregado" (delivered_at).
export default function FoodContributions({ order, onChanged }) {
  const { profile, isProvider, isPreview } = useAuth()
  const toast = useToast()
  const [contribs, setContribs] = useState([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('order_contributions')
      .select('*').eq('order_id', order.id).order('created_at', { ascending: true })
    setContribs(data || [])
    setLoading(false)
  }, [order.id])

  useEffect(() => { cargar() }, [cargar])

  const total = contribs.reduce((s, c) => s + (c.amount || 0), 0)
  const meta = order.people || 0
  const pct = meta > 0 ? Math.min(100, Math.round((total / meta) * 100)) : 0
  const falta = Math.max(0, meta - total)
  const cubierto = total >= meta && meta > 0
  const pendientesEntrega = contribs.filter(c => !c.delivered_at).length
  const todoEntregado = cubierto && pendientesEntrega === 0

  async function aportar() {
    if (isPreview) return
    const n = parseInt(amount)
    if (!n || n < 1) { toast('Indica cuántas comidas puedes aportar.', 'error'); return }
    if (n > falta) {
      if (!window.confirm(`Solo faltan ${falta} comidas. ¿Aportar ${falta} en lugar de ${n}?`)) return
    }
    const aporte = Math.min(n, falta)
    setBusy(true)
    const { error } = await supabase.rpc('aportar_comida', { p_order_id: order.id, p_amount: aporte })
    setBusy(false)
    if (error) { toast(error.message || 'No se pudo registrar el aporte.', 'error'); return }
    toast(`¡Gracias! Registramos tu aporte de ${aporte} comidas.`)
    setAmount('')
    await cargar()
    onChanged && onChanged()
  }

  async function marcarEntregado(id) {
    if (isPreview) return
    setBusy(true)
    const { error } = await supabase.rpc('marcar_aporte_entregado', { p_contribution_id: id })
    setBusy(false)
    if (error) { toast('No se pudo marcar como entregado.', 'error'); return }
    toast('¡Entrega confirmada! Gracias, pana.')
    await cargar()
    onChanged && onChanged()
  }

  async function deshacer(id) {
    if (isPreview) return
    if (!window.confirm('¿Deshacer tu aporte?')) return
    setBusy(true)
    const { error } = await supabase.rpc('deshacer_aporte', { p_contribution_id: id })
    setBusy(false)
    if (error) { toast('No se pudo deshacer.', 'error'); return }
    toast('Aporte deshecho.')
    await cargar()
    onChanged && onChanged()
  }

  if (loading) return <div className="muted" style={{ fontSize: 13 }}>Cargando aportes…</div>

  return (
    <div className="food-contrib">
      {/* Barra de progreso */}
      <div className="contrib-bar-row">
        <div className="contrib-bar-track">
          <div className={`contrib-bar-fill ${todoEntregado ? 'done' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="contrib-bar-label">{total} de {meta} comidas ({pct}%)</span>
      </div>

      {/* Estado global */}
      {cubierto && !todoEntregado && (
        <div className="contrib-state">✓ Cubierto · pendiente de entrega</div>
      )}
      {todoEntregado && (
        <div className="contrib-complete">✓ ¡Entregado! {total} comidas cubiertas y entregadas.</div>
      )}

      {/* Lista de aportes */}
      {contribs.length > 0 && (
        <ul className="contrib-list">
          {contribs.map(c => {
            const propio = profile && c.provider_id === profile.id
            return (
              <li key={c.id}>
                <span>
                  {c.provider_name || 'Proveedor'} — <strong>{c.amount}</strong> comidas
                  {c.delivered_at
                    ? <span className="contrib-tag entregado">entregado</span>
                    : <span className="contrib-tag pendiente">pendiente</span>}
                </span>
                {propio && !isPreview && !busy && (
                  <span className="contrib-row-actions">
                    {!c.delivered_at && (
                      <button className="btn xs success" onClick={() => marcarEntregado(c.id)}>Ya entregué</button>
                    )}
                    {!c.delivered_at && (
                      <button className="contrib-undo" onClick={() => deshacer(c.id)}>deshacer</button>
                    )}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Campo para aportar (proveedores, si no está cubierto) */}
      {isProvider && !isPreview && !cubierto && (
        <div className="contrib-form">
          <input type="number" min="1" max={falta} value={amount}
            onChange={e => setAmount(e.target.value)} placeholder={`¿Cuántas? (faltan ${falta})`} />
          <button className="btn sm primary" onClick={aportar} disabled={busy}>
            {busy ? 'Registrando…' : 'Aportar comidas'}
          </button>
        </div>
      )}
    </div>
  )
}

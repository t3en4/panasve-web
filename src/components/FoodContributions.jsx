import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

// Muestra el progreso de aportes de un pedido de comida y permite aportar.
export default function FoodContributions({ order, onChanged }) {
  const { profile, isProvider } = useAuth()
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
  const completo = total >= meta && meta > 0

  async function aportar() {
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

  async function deshacer(id) {
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
          <div className={`contrib-bar-fill ${completo ? 'done' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="contrib-bar-label">{total} de {meta} comidas ({pct}%)</span>
      </div>

      {/* Lista de aportes */}
      {contribs.length > 0 && (
        <ul className="contrib-list">
          {contribs.map(c => (
            <li key={c.id}>
              <span>{c.provider_name || 'Proveedor'} — <strong>{c.amount}</strong> comidas</span>
              {profile && c.provider_id === profile.id && !busy && (
                <button className="contrib-undo" onClick={() => deshacer(c.id)}>deshacer</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Campo para aportar (solo proveedores, si no está completo) */}
      {isProvider && !completo && (
        <div className="contrib-form">
          <input type="number" min="1" max={falta} value={amount}
            onChange={e => setAmount(e.target.value)} placeholder={`¿Cuántas? (faltan ${falta})`} />
          <button className="btn sm primary" onClick={aportar} disabled={busy}>
            {busy ? 'Registrando…' : 'Aportar comidas'}
          </button>
        </div>
      )}
      {completo && <div className="contrib-complete">✓ ¡Pedido completo! {total} comidas cubiertas.</div>}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, parseCoords } from '../lib/supabase'
import { REGLAS_ORO, REGLAS_ORO_NOTA } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import CoordsHelp from '../components/CoordsHelp'

const MEALS = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena']
const MAX_ITEMS = 20

export default function NewOrder() {
  const { id } = useParams()          // si viene, estamos editando
  const editing = !!id
  const { shelter, isShelter, loading, isPreview } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [type, setType] = useState('comida')
  const [meals, setMeals] = useState([])
  const [items, setItems] = useState([{ name: '', qty: '' }])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    people: '', date: new Date().toISOString().split('T')[0], notes: '', allergies: '',
    location: '', coords: '',
  })

  // Al crear: pre-llenar la ubicación con la del refugio
  useEffect(() => {
    if (editing || !shelter) return
    setForm(f => ({
      ...f,
      location: f.location || shelter.location || '',
      coords: f.coords || (shelter.lat != null ? `${shelter.lat},${shelter.lng}` : ''),
    }))
  }, [editing, shelter])

  // Cargar el pedido si estamos editando
  useEffect(() => {
    if (!editing) return
    supabase.from('orders').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) { toast('Pedido no encontrado.', 'error'); navigate('/'); return }
      if (data.status !== 'pending') { toast('Solo se pueden editar pedidos pendientes.', 'error'); navigate('/'); return }
      setType(data.order_type || 'comida')
      setMeals(data.meals || [])
      setItems(data.items?.length ? data.items.map(i => ({ name: i.name, qty: String(i.qty) })) : [{ name: '', qty: '' }])
      setForm({
        people: data.people || '', date: data.order_date, notes: data.notes || '', allergies: data.allergies || '',
        location: data.location || '', coords: data.lat != null ? `${data.lat},${data.lng}` : '',
      })
    })
  }, [editing, id])

  if (loading) return <div className="loading">Cargando…</div>
  if (isPreview) {
    return <div className="content"><div className="empty-state">
      <span className="icon">👁️</span>
      <p>Estás en modo previsualización (solo lectura). No se pueden crear pedidos.</p>
      <button className="btn primary" style={{ marginTop: 12 }} onClick={() => navigate('/')}>Volver</button>
    </div></div>
  }
  if (!isShelter) {
    return <div className="content"><div className="empty-state">
      <span className="icon">🔒</span>
      <p>Solo los solicitantes registrados pueden crear pedidos.</p>
      <button className="btn primary" style={{ marginTop: 12 }} onClick={() => navigate('/login')}>Iniciar sesión</button>
    </div></div>
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function toggleMeal(m) {
    setMeals(prev => {
      if (m === 'Todos') return ['Todos']
      const next = prev.filter(x => x !== 'Todos')
      return next.includes(m) ? next.filter(x => x !== m) : [...next, m]
    })
  }

  // --- insumos ---
  function setItem(i, key, val) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [key]: val } : it))
  }
  function addItem() {
    if (items.length >= MAX_ITEMS) { toast(`Máximo ${MAX_ITEMS} insumos por pedido.`, 'error'); return }
    setItems(prev => [...prev, { name: '', qty: '' }])
  }
  function removeItem(i) {
    setItems(prev => prev.length === 1 ? [{ name: '', qty: '' }] : prev.filter((_, idx) => idx !== i))
  }

  async function submit() {
    // Salvaguarda: si la cuenta es refugio pero no tiene registro asociado
    if (!shelter?.id) {
      toast('Tu cuenta de solicitante no está completa. Ve a Mi perfil o contacta al admin.', 'error')
      return
    }
    // Validación según tipo
    if (type === 'comida') {
      const people = parseInt(form.people)
      if (!people || people < 1) { toast('Indica el número de personas.', 'error'); return }
      if (!meals.length) { toast('Selecciona al menos un tipo de comida.', 'error'); return }
    } else {
      const valid = items.filter(i => i.name.trim() && parseFloat(i.qty) > 0)
      if (!valid.length) { toast('Agrega al menos un insumo con su cantidad.', 'error'); return }
    }

    setSaving(true)
    const { lat, lng } = parseCoords(form.coords)
    const payload = {
      shelter_id: shelter.id,
      order_type: type,
      order_date: form.date,
      notes: form.notes,
      location: form.location || null,
      lat, lng,
    }
    if (type === 'comida') {
      payload.people = parseInt(form.people)
      payload.meals = meals
      payload.items = null
      payload.allergies = form.allergies || null
    } else {
      payload.people = null
      payload.meals = null
      payload.allergies = null
      payload.items = items
        .filter(i => i.name.trim() && parseFloat(i.qty) > 0)
        .map(i => ({ name: i.name.trim(), qty: parseFloat(i.qty) }))
    }

    try {
      if (editing) {
        // Editar mantiene el pedido como está (un solo pedido)
        const { error } = await supabase.from('orders').update(payload).eq('id', id)
        if (error) throw error
        toast('Pedido actualizado.')
        navigate('/')
      } else if (type === 'insumos') {
        // Cada insumo se vuelve su propio pedido (con su tracking)
        const validItems = items
          .filter(i => i.name.trim() && parseFloat(i.qty) > 0)
          .map(i => ({ name: i.name.trim(), qty: parseFloat(i.qty) }))
        const filas = validItems.map(it => ({
          ...payload, items: [it], status: 'pending',
        }))
        const { error } = await supabase.from('orders').insert(filas)
        if (error) throw error
        // Notificación agrupada: UN solo correo con todos los items
        try {
          await supabase.functions.invoke('notify-nuevos-pedidos', {
            body: { shelter_id: shelter.id, items: validItems.map(i => `${i.name}${i.qty ? ` (${i.qty})` : ''}`) },
          })
        } catch (e) { console.error('notify error', e) }
        toast(`¡${filas.length} ${filas.length === 1 ? 'pedido publicado' : 'pedidos publicados'}! Los panas pueden tomarlos por separado.`)
        navigate('/')
      } else {
        // Comida: un solo pedido
        const { error } = await supabase.from('orders').insert({ ...payload, status: 'pending' })
        if (error) throw error
        try {
          await supabase.functions.invoke('notify-nuevos-pedidos', {
            body: { shelter_id: shelter.id, items: [`Comida para ${payload.people} personas (${(payload.meals || []).join(', ')})`] },
          })
        } catch (e) { console.error('notify error', e) }
        toast('¡Pedido publicado! Los panas cercanos pueden verlo ahora.')
        navigate('/')
      }
    } catch (e) {
      console.error(e)
      toast('Hubo un error al guardar. Intenta de nuevo.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="content">
      <div className="section-header">
        <div className="section-title">{editing ? 'Editar pedido' : 'Nuevo pedido'}</div>
      </div>

      <div className="card">
        <div className="card-sub" style={{ marginBottom: 6 }}>Publicando como</div>
        <div style={{ fontWeight: 600 }}>{shelter?.name} — <span className="muted" style={{ fontWeight: 400 }}>{shelter?.location}</span></div>
      </div>

      {/* Tipo de pedido */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>¿Qué necesitas?</div>
        <div className="type-toggle">
          <button className={`type-btn ${type === 'comida' ? 'active' : ''}`} onClick={() => setType('comida')}>
            🍽️ Comida
          </button>
          <button className={`type-btn ${type === 'insumos' ? 'active' : ''}`} onClick={() => setType('insumos')}>
            📦 Insumos
          </button>
        </div>
      </div>

      {/* Detalles según tipo */}
      {type === 'comida' ? (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Detalles de comida</div>
          <div className="form-grid">
            <div className="field"><label>Número de personas a alimentar <span className="req">*</span></label>
              <input type="number" min="1" value={form.people} onChange={e => set('people', e.target.value)} placeholder="Ej: 150" /></div>
            <div className="field"><label>Fecha del pedido</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
            <div className="field full"><label>Tipo de comida <span className="req">*</span></label>
              <div className="meal-selector">
                {[...MEALS, 'Todos'].map(m => (
                  <button key={m} type="button" className={`meal-chip ${meals.includes(m) ? 'selected' : ''}`} onClick={() => toggleMeal(m)}>{m}</button>
                ))}
              </div></div>
            <div className="field full"><label>Alergias / restricciones alimentarias</label>
              <textarea value={form.allergies} onChange={e => set('allergies', e.target.value)}
                placeholder="Ej: sin maní, sin gluten, intolerancia a lactosa, vegetarianos..." style={{ minHeight: 60 }} /></div>
          </div>

          {/* Reglas de oro de manejo seguro de alimentos */}
          <div className="reglas-box">
            <div className="reglas-title">⚠️ Reglas de oro para alimentos</div>
            <ul className="reglas-list">
              {REGLAS_ORO.map((r, i) => (
                <li key={i}><strong>{r.titulo}:</strong> {r.texto}</li>
              ))}
            </ul>
            <div className="reglas-nota">{REGLAS_ORO_NOTA}</div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>Lista de insumos</div>
          <div className="card-sub" style={{ marginBottom: 16 }}>Agrega cada insumo con su cantidad (máximo {MAX_ITEMS}). Cada insumo se publica como un pedido independiente, para que distintos proveedores puedan tomar lo que cada uno pueda aportar.</div>
          <div className="items-list">
            {items.map((it, i) => (
              <div className="item-row" key={i}>
                <input className="item-name" value={it.name} onChange={e => setItem(i, 'name', e.target.value)} placeholder="Insumo (ej: Agua, Arroz, Pañales)" />
                <input className="item-qty" type="number" min="0" value={it.qty} onChange={e => setItem(i, 'qty', e.target.value)} placeholder="Cant." />
                {!editing && items.length > 1 && <button className="item-remove" onClick={() => removeItem(i)} aria-label="Quitar insumo">✕</button>}
              </div>
            ))}
          </div>
          {!editing && (
            <button className="btn sm" style={{ marginTop: 12 }} onClick={addItem} disabled={items.length >= MAX_ITEMS}>
              + Agregar insumo {items.length >= MAX_ITEMS && '(máx alcanzado)'}
            </button>
          )}
          <div className="form-grid" style={{ marginTop: 16 }}>
            <div className="field"><label>Fecha del pedido</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
          </div>
        </div>
      )}

      {/* Ubicación de entrega del pedido */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 4 }}>Ubicación de entrega</div>
        <div className="card-sub" style={{ marginBottom: 14 }}>
          Se copió la de tu refugio. Cámbiala si este pedido se entrega en otro lugar.
        </div>
        <div className="form-grid">
          <div className="field full"><label>Dirección de entrega</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Ej: La Guaira, Vargas" /></div>
          <div className="field full"><label>Ubicación en Google Maps <CoordsHelp /></label>
            <input value={form.coords} onChange={e => set('coords', e.target.value)} placeholder="Pega el enlace de Google Maps o coordenadas" />
            <span className="field-hint">Sirve para que los proveedores calculen la distancia.</span></div>
        </div>
      </div>

      <div className="card">
        <div className="field full"><label>Notas adicionales</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Restricciones, detalles de entrega, necesidades especiales..." /></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 24 }}>
        <button className="btn" onClick={() => navigate('/')}>Cancelar</button>
        <button className="btn primary" onClick={submit} disabled={saving}>
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar pedido'}
        </button>
      </div>
    </div>
  )
}

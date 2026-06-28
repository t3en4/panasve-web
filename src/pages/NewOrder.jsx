import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, parseCoords } from '../lib/supabase'
import { useToast } from '../components/Toast'

const MEALS = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena']

export default function NewOrder() {
  const toast = useToast()
  const navigate = useNavigate()
  const [shelters, setShelters] = useState([])
  const [matches, setMatches] = useState([])
  const [filledId, setFilledId] = useState(null)
  const [meals, setMeals] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', location: '', phone: '', email: '', contact: '', contact_recv: '',
    instagram: '', coords: '', people: '', date: new Date().toISOString().split('T')[0], notes: '',
  })
  const nameRef = useRef()

  useEffect(() => {
    supabase.from('shelters').select('*').then(({ data }) => setShelters(data || []))
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function onNameChange(v) {
    set('name', v)
    setFilledId(null)
    if (v.length < 2) { setMatches([]); return }
    setMatches(shelters.filter(s => s.name.toLowerCase().includes(v.toLowerCase())).slice(0, 6))
  }

  function fillShelter(s) {
    setForm(f => ({
      ...f,
      name: s.name, location: s.location || '', phone: s.phone || '', email: s.email || '',
      contact: s.contact || '', contact_recv: s.contact_recv || '', instagram: s.instagram || '',
      coords: s.lat != null ? `${s.lat},${s.lng}` : '',
    }))
    setFilledId(s.id)
    setMatches([])
  }

  function toggleMeal(m) {
    setMeals(prev => {
      if (m === 'Todos') return ['Todos']
      const next = prev.filter(x => x !== 'Todos')
      return next.includes(m) ? next.filter(x => x !== m) : [...next, m]
    })
  }

  async function submit() {
    if (!form.name || !form.location || !form.phone || !form.contact) {
      toast('Completa los campos obligatorios del refugio.', 'error'); return
    }
    const people = parseInt(form.people)
    if (!people || people < 1) { toast('Indica el número de personas.', 'error'); return }
    if (!meals.length) { toast('Selecciona al menos un tipo de comida.', 'error'); return }

    setSaving(true)
    const { lat, lng } = parseCoords(form.coords)
    let shelterId = filledId

    try {
      if (!shelterId) {
        // ¿existe por nombre? (evita duplicados)
        const { data: existing } = await supabase
          .from('shelters').select('id').ilike('name', form.name.trim()).maybeSingle()
        if (existing) {
          shelterId = existing.id
          await supabase.from('shelters').update({
            location: form.location, phone: form.phone, email: form.email, contact: form.contact,
            contact_recv: form.contact_recv, instagram: form.instagram, lat, lng,
          }).eq('id', shelterId)
        } else {
          const { data: created, error } = await supabase.from('shelters').insert({
            name: form.name.trim(), location: form.location, phone: form.phone, email: form.email,
            contact: form.contact, contact_recv: form.contact_recv, instagram: form.instagram, lat, lng,
          }).select('id').single()
          if (error) throw error
          shelterId = created.id
        }
      } else {
        await supabase.from('shelters').update({
          location: form.location, phone: form.phone, email: form.email, contact: form.contact,
          contact_recv: form.contact_recv, instagram: form.instagram, lat, lng,
        }).eq('id', shelterId)
      }

      const { error: ordErr } = await supabase.from('orders').insert({
        shelter_id: shelterId, people, meals, order_date: form.date, notes: form.notes, status: 'pending',
      })
      if (ordErr) throw ordErr

      toast('¡Pedido enviado! Los panas cercanos pueden verlo ahora.')
      navigate('/')
    } catch (e) {
      console.error(e)
      toast('Hubo un error al enviar el pedido. Intenta de nuevo.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="content">
      <div className="section-header"><div className="section-title">Nuevo pedido de alimentos</div></div>

      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <div className="card-title">Datos del refugio</div>
          <div className="card-sub">Si ya registraste tu refugio antes, escribe el nombre para autocompletar.</div>
        </div>

        <div className="form-grid">
          <div className="field full autocomplete-wrap">
            <label>Nombre del refugio <span className="req">*</span></label>
            <input ref={nameRef} value={form.name} placeholder="Ej: Refugio San José"
              onChange={e => onNameChange(e.target.value)} autoComplete="off" />
            {matches.length > 0 && (
              <div className="autocomplete-list">
                {matches.map(s => (
                  <div key={s.id} className="autocomplete-item" onClick={() => fillShelter(s)}>
                    {s.name} — {s.location}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="field"><label>Ubicación / dirección <span className="req">*</span></label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Ej: La Guaira, Vargas" /></div>
          <div className="field"><label>Teléfono de contacto <span className="req">*</span></label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+58 212 ..." /></div>
          <div className="field"><label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="refugio@email.com" /></div>
          <div className="field"><label>Persona de contacto <span className="req">*</span></label>
            <input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Nombre del responsable" /></div>
          <div className="field"><label>Persona que recibe</label>
            <input value={form.contact_recv} onChange={e => set('contact_recv', e.target.value)} placeholder="Nombre de quien recibe" /></div>
          <div className="field"><label>Instagram</label>
            <input value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@nombre_perfil" /></div>
          <div className="field full"><label>Pin de ubicación (Google Maps)</label>
            <input value={form.coords} onChange={e => set('coords', e.target.value)} placeholder="Coordenadas, ej: 10.4806,-66.9036" />
            <span className="field-hint">Abre Google Maps, mantén presionada tu ubicación y copia las coordenadas que aparecen.</span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Detalles del pedido</div>
        <div className="form-grid">
          <div className="field"><label>Número de personas a alimentar <span className="req">*</span></label>
            <input type="number" min="1" value={form.people} onChange={e => set('people', e.target.value)} placeholder="Ej: 150" /></div>
          <div className="field"><label>Fecha del pedido</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
          <div className="field full"><label>Tipo de comida requerida <span className="req">*</span></label>
            <div className="meal-selector">
              {[...MEALS, 'Todos'].map(m => (
                <button key={m} type="button" className={`meal-chip ${meals.includes(m) ? 'selected' : ''}`} onClick={() => toggleMeal(m)}>{m}</button>
              ))}
            </div></div>
          <div className="field full"><label>Notas adicionales</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Restricciones dietéticas, alergias, necesidades especiales..." /></div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 24 }}>
        <button className="btn" onClick={() => navigate('/')}>Cancelar</button>
        <button className="btn primary" onClick={submit} disabled={saving}>
          {saving ? 'Enviando…' : 'Enviar pedido'}
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase, parseCoords } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function Profile() {
  const { profile, shelter, isShelter, refreshProfile } = useAuth()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  // Origen de datos según rol
  const src = isShelter ? shelter : profile
  const [form, setForm] = useState({
    name: '', phone: '', contact: '', contact_recv: '',
    instagram: '', address: '', location: '', coords: '',
  })

  // Rellenar el formulario cuando los datos del usuario terminan de cargar
  useEffect(() => {
    if (!src) return
    setForm({
      name: src.name || '',
      phone: src.phone || '',
      contact: src.contact || '',
      contact_recv: shelter?.contact_recv || '',
      instagram: src.instagram || '',
      address: profile?.address || '',
      location: shelter?.location || '',
      coords: src.lat != null ? `${src.lat},${src.lng}` : '',
    })
  }, [src, shelter, profile])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true)
    const { lat, lng } = parseCoords(form.coords)
    let error
    if (isShelter) {
      ({ error } = await supabase.from('shelters').update({
        name: form.name, location: form.location, phone: form.phone, contact: form.contact,
        contact_recv: form.contact_recv, instagram: form.instagram, lat, lng,
      }).eq('id', shelter.id))
    } else {
      ({ error } = await supabase.from('profiles').update({
        name: form.name, phone: form.phone, contact: form.contact,
        instagram: form.instagram, address: form.address, lat, lng,
      }).eq('id', profile.id))
    }
    setSaving(false)
    if (error) { toast('No se pudo guardar.', 'error'); return }
    await refreshProfile()
    toast('Perfil actualizado.')
  }

  if (!profile) return null

  return (
    <div className="content">
      <div className="section-header"><div className="section-title">Mi perfil</div></div>
      <div className="card" style={{ maxWidth: 620 }}>
        <div className="form-grid">
          <div className="field"><label>{isShelter ? 'Nombre del refugio' : 'Nombre / Restaurante'}</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="field"><label>Email</label><input value={profile.email} disabled /></div>
          <div className="field"><label>Teléfono</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div className="field"><label>Persona de contacto</label>
            <input value={form.contact} onChange={e => set('contact', e.target.value)} /></div>
          {isShelter && (
            <>
              <div className="field"><label>Persona que recibe</label>
                <input value={form.contact_recv} onChange={e => set('contact_recv', e.target.value)} /></div>
              <div className="field full"><label>Ubicación / dirección</label>
                <input value={form.location} onChange={e => set('location', e.target.value)} /></div>
            </>
          )}
          {!isShelter && (
            <div className="field full"><label>Dirección</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} /></div>
          )}
          <div className="field"><label>Instagram</label>
            <input value={form.instagram} onChange={e => set('instagram', e.target.value)} /></div>
          <div className="field full"><label>Ubicación en Google Maps</label>
            <input value={form.coords} onChange={e => set('coords', e.target.value)} placeholder="Enlace de Google Maps o coordenadas" />
            <span className="field-hint">Se usa para ordenar los pedidos por cercanía.</span></div>
        </div>
        <div className="divider" />
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

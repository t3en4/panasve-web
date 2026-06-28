import { useState } from 'react'
import { supabase, parseCoords } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function Profile() {
  const { profile, refreshProfile } = useAuth()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    contact: profile?.contact || '',
    instagram: profile?.instagram || '',
    address: profile?.address || '',
    coords: profile?.lat != null ? `${profile.lat},${profile.lng}` : '',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true)
    const { lat, lng } = parseCoords(form.coords)
    const { error } = await supabase.from('profiles').update({
      name: form.name, phone: form.phone, contact: form.contact,
      instagram: form.instagram, address: form.address, lat, lng,
    }).eq('id', profile.id)
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
          <div className="field"><label>Nombre / Restaurante</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="field"><label>Email</label>
            <input value={profile.email} disabled /></div>
          <div className="field"><label>Teléfono</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div className="field"><label>Persona de contacto</label>
            <input value={form.contact} onChange={e => set('contact', e.target.value)} /></div>
          <div className="field"><label>Instagram</label>
            <input value={form.instagram} onChange={e => set('instagram', e.target.value)} /></div>
          <div className="field full"><label>Dirección</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div className="field full"><label>Coordenadas</label>
            <input value={form.coords} onChange={e => set('coords', e.target.value)} placeholder="Ej: 10.4806,-66.9036" />
            <span className="field-hint">Se usan para ordenar los pedidos por cercanía a tu local.</span></div>
        </div>
        <div className="divider" />
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

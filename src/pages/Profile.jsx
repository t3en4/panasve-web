import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, parseCoords, distanceKm } from '../lib/supabase'
import { ESTADOS, PROVIDER_TYPES, SHELTER_TYPES } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import CoordsHelp from '../components/CoordsHelp'
import OrdersMap from '../components/OrdersMap'
import SafetyGuide from '../components/SafetyGuide'

export default function Profile() {
  const { profile, shelter, isShelter, isProvider, refreshProfile, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [mapMarkers, setMapMarkers] = useState([])

  // Origen de datos según rol
  const src = isShelter ? shelter : profile
  const [form, setForm] = useState({
    name: '', phone: '', contact: '', contact_recv: '',
    instagram: '', address: '', location: '', coords: '', estado: '', provider_type: 'restaurante', shelter_type: 'refugio',
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
      estado: src.estado || '',
      provider_type: profile?.provider_type || 'restaurante',
      shelter_type: shelter?.shelter_type || 'refugio',
    })
  }, [src, shelter, profile])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Cargar pedidos pendientes para el mapa (solo proveedores)
  useEffect(() => {
    if (!isProvider) return
    async function load() {
      const [{ data: ord }, { data: shl }] = await Promise.all([
        supabase.from('orders').select('shelter_id, order_type, people, items, location, lat, lng').eq('status', 'pending'),
        supabase.from('shelters').select('id, name, lat, lng, estado'),
      ])
      const shMap = {}
      ;(shl || []).forEach(s => { shMap[s.id] = s })
      const marks = (ord || []).map(o => {
        const s = shMap[o.shelter_id]
        const lat = o.lat != null ? o.lat : s?.lat
        const lng = o.lng != null ? o.lng : s?.lng
        if (lat == null) return null
        const resumen = o.order_type === 'insumos'
          ? `${(o.items || []).length} insumos`
          : `${o.people} personas`
        return { lat, lng, title: s?.name || 'Refugio', subtitle: resumen }
      }).filter(Boolean)
      setMapMarkers(marks)
    }
    load()
  }, [isProvider])

  async function save() {
    // Campos obligatorios para refugios
    if (isShelter) {
      if (!shelter?.id) {
        toast('Tu cuenta de refugio no está completa. Cierra sesión y vuelve a entrar; si persiste, contacta al admin.', 'error')
        return
      }
      if (!form.location?.trim() || !form.phone?.trim() || !form.contact?.trim() || !form.contact_recv?.trim()) {
        toast('Completa dirección, teléfono, persona de contacto y persona que recibe.', 'error')
        return
      }
    }
    // El estado es obligatorio para todos
    if (!form.estado) {
      toast('Selecciona tu estado.', 'error')
      return
    }
    // El teléfono es obligatorio para todos
    if (!form.phone?.trim()) {
      toast('Ingresa un teléfono de contacto.', 'error')
      return
    }
    setSaving(true)
    const { lat, lng } = parseCoords(form.coords)
    let error
    if (isShelter) {
      ({ error } = await supabase.from('shelters').update({
        name: form.name, location: form.location, phone: form.phone, contact: form.contact,
        contact_recv: form.contact_recv, instagram: form.instagram, estado: form.estado,
        shelter_type: form.shelter_type, lat, lng,
      }).eq('id', shelter.id))
    } else {
      ({ error } = await supabase.from('profiles').update({
        name: form.name, phone: form.phone, contact: form.contact,
        instagram: form.instagram, address: form.address, estado: form.estado,
        provider_type: form.provider_type, lat, lng,
      }).eq('id', profile.id))
    }
    setSaving(false)
    if (error) { toast('No se pudo guardar.', 'error'); return }
    await refreshProfile()
    toast('Perfil actualizado.')
  }

  async function desactivarCuenta() {
    const msg = isShelter
      ? '¿Seguro que quieres desactivar tu cuenta? Tus pedidos activos se cancelarán y dejarás de recibir correos. Podrás pedir reactivación al equipo de PanasVE.'
      : '¿Seguro que quieres desactivar tu cuenta? Dejarás de recibir correos y de aparecer en la plataforma. Podrás pedir reactivación al equipo de PanasVE.'
    if (!window.confirm(msg)) return
    setDeactivating(true)
    try {
      // Cancela pedidos activos propios (solo aplica a refugios) y marca la cuenta
      if (isShelter) await supabase.rpc('cancelar_pedidos_activos_propios')
      const { error } = await supabase.rpc('desactivar_mi_cuenta')
      if (error) { toast('No se pudo desactivar la cuenta.', 'error'); setDeactivating(false); return }
      toast('Tu cuenta fue desactivada. Cerrando sesión…')
      setTimeout(async () => { await signOut(); navigate('/') }, 1500)
    } catch {
      toast('No se pudo desactivar la cuenta.', 'error')
      setDeactivating(false)
    }
  }

  if (!profile) return null

  return (
    <div className="content">
      <div className="section-header"><div className="section-title">Mi perfil</div></div>
      <div className="card" style={{ maxWidth: 620 }}>
        <div className="form-grid">
          <div className="field"><label>{isShelter ? 'Nombre (organización, refugio o tuyo)' : 'Nombre / Negocio'}</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="field"><label>Email</label><input value={profile.email} disabled /></div>
          {isShelter && (
            <div className="field"><label>Tipo</label>
              <select value={form.shelter_type} onChange={e => set('shelter_type', e.target.value)}>
                {SHELTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select></div>
          )}
          {!isShelter && (
            <div className="field"><label>Tipo de proveedor</label>
              <select value={form.provider_type} onChange={e => set('provider_type', e.target.value)}>
                {PROVIDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select></div>
          )}
          <div className="field"><label>Teléfono <span className="req">*</span></label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div className="field"><label>Persona de contacto{isShelter && <span className="req"> *</span>}</label>
            <input value={form.contact} onChange={e => set('contact', e.target.value)} /></div>
          {isShelter && (
            <>
              <div className="field"><label>Persona que recibe <span className="req">*</span></label>
                <input value={form.contact_recv} onChange={e => set('contact_recv', e.target.value)} /></div>
              <div className="field full"><label>Ubicación / dirección <span className="req">*</span></label>
                <input value={form.location} onChange={e => set('location', e.target.value)} /></div>
            </>
          )}
          {!isShelter && (
            <div className="field full"><label>Dirección</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} /></div>
          )}
          <div className="field"><label>Estado <span className="req">*</span></label>
            <select value={form.estado} onChange={e => set('estado', e.target.value)}>
              <option value="">Selecciona…</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select></div>
          <div className="field"><label>Instagram</label>
            <input value={form.instagram} onChange={e => set('instagram', e.target.value)} /></div>
          <div className="field full"><label>Ubicación en Google Maps <CoordsHelp /></label>
            <input value={form.coords} onChange={e => set('coords', e.target.value)} placeholder="Enlace de Google Maps o coordenadas" />
            <span className="field-hint">Se usa para ordenar los pedidos por cercanía.</span></div>
        </div>
        <div className="divider" />
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {/* Guía de seguridad alimentaria (educativa) */}
      <div style={{ maxWidth: 620 }}>
        <SafetyGuide />
      </div>

      {isProvider && (
        <div className="card" style={{ maxWidth: 620 }}>
          <div className="card-title" style={{ marginBottom: 4 }}>Pedidos cercanos</div>
          <div className="card-sub" style={{ marginBottom: 14 }}>
            Pedidos pendientes en el mapa. El punto azul eres tú.
          </div>
          <OrdersMap
            center={{ lat: profile.lat, lng: profile.lng }}
            markers={mapMarkers}
          />
        </div>
      )}

      {/* Zona de cuenta */}
      <div className="card danger-zone" style={{ maxWidth: 620 }}>
        <div className="card-title" style={{ marginBottom: 4 }}>Desactivar mi cuenta</div>
        <div className="card-sub" style={{ marginBottom: 14 }}>
          Tu cuenta se ocultará y dejarás de recibir correos.
          {isShelter ? ' Tus pedidos activos se cancelarán (los entregados quedan como historial).' : ''}
          {' '}No se borra de forma permanente: puedes pedirle al equipo de PanasVE que la reactive.
        </div>
        <button className="btn danger-btn" onClick={desactivarCuenta} disabled={deactivating}>
          {deactivating ? 'Desactivando…' : 'Desactivar mi cuenta'}
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SHELTER_TYPES } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

// Permite a un proveedor activar el "modo Pedir": crea su propio registro de
// solicitante (shelter) prellenado desde su perfil. Una vez activo, la cuenta
// es dual y puede alternar entre Ayudar y Pedir desde el encabezado.
export default function RequestingCard() {
  const { profile, hasShelter, setActiveMode, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const cardRef = useRef(null)
  const [openForm, setOpenForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ location: '', phone: '', contact: '', contact_recv: '', shelter_type: 'organizacion' })

  // Si llegan desde el aviso de la vista de pedidos (?activar=1), abrir el
  // formulario y traer la tarjeta a la vista.
  useEffect(() => {
    if (params.get('activar') === '1' && !hasShelter) {
      setOpenForm(true)
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    }
  }, [params, hasShelter])

  useEffect(() => {
    if (!profile) return
    setF(x => ({
      location: x.location || profile.address || '',
      phone: x.phone || profile.phone || '',
      contact: x.contact || profile.contact || profile.name || '',
      contact_recv: x.contact_recv || profile.contact || profile.name || '',
      shelter_type: x.shelter_type || 'organizacion',
    }))
  }, [profile])

  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  async function activar() {
    if (!f.location.trim() || !f.phone.trim() || !f.contact.trim()) {
      toast('Completa dirección, teléfono y persona de contacto.', 'error'); return
    }
    setBusy(true)
    const { error } = await supabase.from('shelters').insert({
      owner_id: profile.id,
      name: profile.name,
      location: f.location.trim(),
      phone: f.phone.trim(),
      email: profile.email,
      contact: f.contact.trim(),
      contact_recv: f.contact_recv.trim() || f.contact.trim(),
      instagram: profile.instagram || null,
      estado: profile.estado || null,
      shelter_type: f.shelter_type,
      lat: profile.lat,
      lng: profile.lng,
    })
    setBusy(false)
    if (error) { toast('No se pudo activar. Intenta de nuevo o contacta al equipo.', 'error'); return }
    await refreshProfile()
    setActiveMode('shelter')
    toast('¡Listo! Ahora también puedes pedir insumos.')
    navigate('/nuevo')
  }

  // Ya es dual: solo un recordatorio + acceso rápido
  if (hasShelter) {
    return (
      <div className="card requesting-card" ref={cardRef} style={{ maxWidth: 620 }}>
        <div className="card-title" style={{ marginBottom: 4 }}>También puedes pedir insumos</div>
        <div className="card-sub" style={{ marginBottom: 14 }}>
          Tu cuenta también está registrada como solicitante. Cambia entre <strong>Ayudar</strong> y
          {' '}<strong>Pedir</strong> desde el menú de arriba.
        </div>
        <button className="btn primary" onClick={() => { setActiveMode('shelter'); navigate('/nuevo') }}>
          Crear un pedido de insumos
        </button>
      </div>
    )
  }

  return (
    <div className="card requesting-card" ref={cardRef} style={{ maxWidth: 620 }}>
      <div className="card-title" style={{ marginBottom: 4 }}>¿Tú también necesitas insumos?</div>
      <div className="card-sub" style={{ marginBottom: 14 }}>
        Si cocinas o ayudas a otros pero necesitas insumos para hacerlo, puedes activar el modo
        {' '}<strong>Pedir</strong> con esta misma cuenta. Podrás alternar entre ayudar y pedir cuando quieras.
      </div>

      {!openForm ? (
        <button className="btn primary" onClick={() => setOpenForm(true)}>Activar el modo Pedir</button>
      ) : (
        <>
          <div className="form-grid">
            <div className="field"><label>Tipo</label>
              <select value={f.shelter_type} onChange={e => set('shelter_type', e.target.value)}>
                {SHELTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select></div>
            <div className="field"><label>Teléfono <span className="req">*</span></label>
              <input value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+58 212 ..." /></div>
            <div className="field full"><label>Ubicación / dirección <span className="req">*</span></label>
              <input value={f.location} onChange={e => set('location', e.target.value)} placeholder="Ej: La Guaira, Vargas" /></div>
            <div className="field"><label>Persona de contacto <span className="req">*</span></label>
              <input value={f.contact} onChange={e => set('contact', e.target.value)} placeholder="Responsable" /></div>
            <div className="field"><label>Persona que recibe</label>
              <input value={f.contact_recv} onChange={e => set('contact_recv', e.target.value)} placeholder="Quien recibe (si es distinta)" /></div>
          </div>
          <div className="field-hint" style={{ marginTop: 8 }}>
            Usamos los datos de tu perfil de proveedor; ajústalos si tu punto de recepción es distinto.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn primary" onClick={activar} disabled={busy}>
              {busy ? 'Activando…' : 'Activar y crear pedido'}
            </button>
            <button className="btn" onClick={() => setOpenForm(false)} disabled={busy}>Cancelar</button>
          </div>
        </>
      )}
    </div>
  )
}

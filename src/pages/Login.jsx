import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, parseCoords, traducirError } from '../lib/supabase'
import { ESTADOS, PROVIDER_TYPES, SHELTER_TYPES } from '../lib/constants'
import { useToast } from '../components/Toast'
import CoordsHelp from '../components/CoordsHelp'

export default function Login() {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') || '/'
  const [mode, setMode] = useState('login')        // login | choose | register | forgot
  const [regRole, setRegRole] = useState(null)     // 'shelter' | 'provider'
  const [busy, setBusy] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [login, setLogin] = useState({ email: '', password: '' })
  const [reg, setReg] = useState({
    name: '', email: '', password: '', phone: '', contact: '', instagram: '',
    address: '', coords: '', location: '', contact_recv: '', estado: '', provider_type: 'restaurante', shelter_type: 'refugio',
  })

  function setR(k, v) { setReg(r => ({ ...r, [k]: v })) }

  async function doLogin() {
    if (!login.email || !login.password) { toast('Ingresa email y contraseña.', 'error'); return }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: login.email, password: login.password })
    setBusy(false)
    if (error) { toast('Email o contraseña incorrectos.', 'error'); return }
    toast('¡Bienvenido de vuelta!')
    navigate(next)
  }

  async function doReset() {
    if (!resetEmail) { toast('Ingresa tu correo.', 'error'); return }
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/recuperar`,
    })
    setBusy(false)
    if (error) { toast(traducirError(error.message), 'error'); return }
    toast('Si el correo existe, te enviamos un enlace para recuperar tu contraseña.')
    setMode('login')
  }

  async function doRegister() {
    if (!reg.name || !reg.email || !reg.password) { toast('Completa los campos obligatorios.', 'error'); return }
    if (reg.password.length < 6) { toast('La contraseña debe tener al menos 6 caracteres.', 'error'); return }
    if (regRole === 'shelter' && (!reg.location || !reg.phone || !reg.contact || !reg.contact_recv)) {
      toast('Completa dirección, teléfono, persona de contacto y persona que recibe.', 'error'); return
    }
    if (regRole === 'provider' && (!reg.address || !reg.phone)) { toast('Ingresa la dirección y el teléfono.', 'error'); return }
    if (!reg.estado) { toast('Selecciona tu estado.', 'error'); return }

    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: reg.email,
      password: reg.password,
      options: { data: { name: reg.name, role: regRole } },
    })
    if (error) { setBusy(false); toast(traducirError(error.message), 'error'); return }

    const { lat, lng } = parseCoords(reg.coords)
    if (data.user) {
      if (regRole === 'shelter') {
        // Crea el registro del refugio vinculado a la cuenta
        await supabase.from('shelters').insert({
          owner_id: data.user.id, name: reg.name, location: reg.location, phone: reg.phone,
          email: reg.email, contact: reg.contact, contact_recv: reg.contact_recv,
          instagram: reg.instagram, estado: reg.estado, shelter_type: reg.shelter_type, lat, lng,
        })
      } else {
        // Completa el perfil del proveedor
        await supabase.from('profiles').update({
          name: reg.name, phone: reg.phone, contact: reg.contact,
          instagram: reg.instagram, address: reg.address, estado: reg.estado,
          provider_type: reg.provider_type, lat, lng,
        }).eq('id', data.user.id)
      }
      // Enviar correo de bienvenida (no bloquea el registro si falla)
      supabase.functions.invoke('welcome-email', {
        body: { email: reg.email, name: reg.name, role: regRole },
      }).then(({ data, error }) => {
        if (error) console.error('welcome-email error:', error)
        else console.log('welcome-email ok:', data)
      }).catch(e => console.error('welcome-email exception:', e))
    }
    setBusy(false)

    if (!data.session) {
      toast('Cuenta creada. Revisa tu correo para confirmar antes de entrar.')
      setMode('login'); return
    }
    toast('¡Cuenta creada! Bienvenido a PanasVE.')
    navigate(next)
  }

  return (
    <div className="content">
      <div className="auth-wrap">

        {mode === 'login' && (
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <div className="card-title">Iniciar sesión</div>
              <div className="card-sub">Para refugios y proveedores.</div>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Email</label>
              <input type="email" value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} placeholder="tu@email.com" />
            </div>
            <div className="field" style={{ marginBottom: 18 }}>
              <label>Contraseña</label>
              <input type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })}
                placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && doLogin()} />
            </div>
            <button className="btn primary" style={{ width: '100%' }} onClick={doLogin} disabled={busy}>
              {busy ? 'Entrando…' : 'Iniciar sesión'}
            </button>
            <button className="link-btn" style={{ marginTop: 12 }} onClick={() => { setResetEmail(login.email); setMode('forgot') }}>
              ¿Olvidaste tu contraseña?
            </button>
            <div className="divider" />
            <div style={{ textAlign: 'center' }} className="muted">¿No tienes cuenta?</div>
            <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setMode('choose')}>
              Crear una cuenta
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <div className="card-title">Recuperar contraseña</div>
              <div className="card-sub">Te enviaremos un enlace para crear una nueva contraseña.</div>
            </div>
            <div className="field" style={{ marginBottom: 18 }}>
              <label>Email</label>
              <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                placeholder="tu@email.com" onKeyDown={e => e.key === 'Enter' && doReset()} />
            </div>
            <button className="btn primary" style={{ width: '100%' }} onClick={doReset} disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar enlace'}
            </button>
            <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setMode('login')}>Volver</button>
          </div>
        )}

        {mode === 'choose' && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 6 }}>¿Cómo quieres registrarte?</div>
            <div className="card-sub" style={{ marginBottom: 18 }}>Elige el tipo de cuenta.</div>
            <button className="role-option" onClick={() => { setRegRole('shelter'); setMode('register') }}>
              <span className="role-emoji">🙏</span>
              <span>
                <strong>Necesito ayuda</strong>
                <span className="role-desc">Publica pedidos de comida o insumos para tu organización, refugio o familia.</span>
              </span>
            </button>
            <button className="role-option" onClick={() => { setRegRole('provider'); setMode('register') }}>
              <span className="role-emoji">🤝</span>
              <span>
                <strong>Quiero ayudar</strong>
                <span className="role-desc">Restaurante, chef, farmacia, individuo u otro. Toma pedidos cercanos.</span>
              </span>
            </button>
            <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={() => setMode('login')}>Volver</button>
          </div>
        )}

        {mode === 'register' && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>
              {regRole === 'shelter' ? 'Necesito ayuda' : 'Quiero ayudar'}
            </div>
            <div className="form-grid">
              <div className="field full"><label>{regRole === 'shelter' ? 'Nombre (organización, refugio o tuyo)' : 'Nombre / Negocio'} <span className="req">*</span></label>
                <input value={reg.name} onChange={e => setR('name', e.target.value)} placeholder={regRole === 'shelter' ? 'Ej: Refugio San José' : 'Ej: Mi Restaurante'} /></div>
              {regRole === 'shelter' && (
                <div className="field"><label>Tipo <span className="req">*</span></label>
                  <select value={reg.shelter_type} onChange={e => setR('shelter_type', e.target.value)}>
                    {SHELTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select></div>
              )}
              {regRole === 'provider' && (
                <div className="field"><label>Tipo de proveedor <span className="req">*</span></label>
                  <select value={reg.provider_type} onChange={e => setR('provider_type', e.target.value)}>
                    {PROVIDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select></div>
              )}
              <div className="field"><label>Email <span className="req">*</span></label>
                <input type="email" value={reg.email} onChange={e => setR('email', e.target.value)} placeholder="tu@email.com" /></div>
              <div className="field"><label>Contraseña <span className="req">*</span></label>
                <input type="password" value={reg.password} onChange={e => setR('password', e.target.value)} placeholder="Mínimo 6 caracteres" /></div>

              {regRole === 'shelter' ? (
                <>
                  <div className="field"><label>Ubicación / dirección <span className="req">*</span></label>
                    <input value={reg.location} onChange={e => setR('location', e.target.value)} placeholder="Ej: La Guaira, Vargas" /></div>
                  <div className="field"><label>Teléfono <span className="req">*</span></label>
                    <input value={reg.phone} onChange={e => setR('phone', e.target.value)} placeholder="+58 212 ..." /></div>
                  <div className="field"><label>Persona de contacto <span className="req">*</span></label>
                    <input value={reg.contact} onChange={e => setR('contact', e.target.value)} placeholder="Responsable" /></div>
                  <div className="field"><label>Persona que recibe <span className="req">*</span></label>
                    <input value={reg.contact_recv} onChange={e => setR('contact_recv', e.target.value)} placeholder="Quien recibe" /></div>
                </>
              ) : (
                <>
                  <div className="field"><label>Teléfono <span className="req">*</span></label>
                    <input value={reg.phone} onChange={e => setR('phone', e.target.value)} placeholder="+58 212 ..." /></div>
                  <div className="field"><label>Persona de contacto</label>
                    <input value={reg.contact} onChange={e => setR('contact', e.target.value)} placeholder="Nombre" /></div>
                  <div className="field full"><label>Dirección <span className="req">*</span></label>
                    <input value={reg.address} onChange={e => setR('address', e.target.value)} placeholder="Av. Principal, Municipio, Ciudad" /></div>
                </>
              )}

              <div className="field"><label>Estado <span className="req">*</span></label>
                <select value={reg.estado} onChange={e => setR('estado', e.target.value)}>
                  <option value="">Selecciona…</option>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select></div>
              <div className="field"><label>Instagram</label>
                <input value={reg.instagram} onChange={e => setR('instagram', e.target.value)} placeholder="@perfil" /></div>
              <div className="field full"><label>Ubicación en Google Maps <CoordsHelp /></label>
                <input value={reg.coords} onChange={e => setR('coords', e.target.value)} placeholder="Pega el enlace de Google Maps o coordenadas" />
                <span className="field-hint">Sirve para ordenar los pedidos por cercanía.</span></div>
            </div>
            <button className="btn primary" style={{ width: '100%', marginTop: 16 }} onClick={doRegister} disabled={busy}>
              {busy ? 'Creando…' : 'Crear cuenta'}
            </button>
            <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setMode('choose')}>Volver</button>
          </div>
        )}

      </div>
    </div>
  )
}

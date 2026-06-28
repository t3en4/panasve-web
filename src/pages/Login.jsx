import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, parseCoords } from '../lib/supabase'
import { useToast } from '../components/Toast'

export default function Login() {
  const toast = useToast()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [login, setLogin] = useState({ email: '', password: '' })
  const [reg, setReg] = useState({
    name: '', email: '', password: '', phone: '', contact: '', instagram: '', address: '', coords: '',
  })

  function setR(k, v) { setReg(r => ({ ...r, [k]: v })) }

  async function doLogin() {
    if (!login.email || !login.password) { toast('Ingresa email y contraseña.', 'error'); return }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: login.email, password: login.password })
    setBusy(false)
    if (error) { toast('Email o contraseña incorrectos.', 'error'); return }
    toast('¡Bienvenido de vuelta!')
    navigate('/')
  }

  async function doRegister() {
    if (!reg.name || !reg.email || !reg.password || !reg.address) {
      toast('Completa los campos obligatorios.', 'error'); return
    }
    if (reg.password.length < 6) { toast('La contraseña debe tener al menos 6 caracteres.', 'error'); return }

    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: reg.email,
      password: reg.password,
      options: { data: { name: reg.name } },
    })
    if (error) { setBusy(false); toast(error.message || 'No se pudo crear la cuenta.', 'error'); return }

    // El trigger crea el perfil base; completamos los datos del proveedor
    const { lat, lng } = parseCoords(reg.coords)
    if (data.user) {
      await supabase.from('profiles').update({
        name: reg.name, phone: reg.phone, contact: reg.contact,
        instagram: reg.instagram, address: reg.address, lat, lng,
      }).eq('id', data.user.id)
    }
    setBusy(false)

    if (!data.session) {
      toast('Cuenta creada. Revisa tu correo para confirmar antes de entrar.')
      setMode('login')
      return
    }
    toast('¡Cuenta creada! Bienvenido a PanasVE.')
    navigate('/')
  }

  return (
    <div className="content">
      <div className="auth-wrap">
        {mode === 'login' ? (
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <div className="card-title">Acceso para restaurantes y chefs</div>
              <div className="card-sub">Inicia sesión para ver pedidos cercanos a ti.</div>
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
            <div className="divider" />
            <div style={{ textAlign: 'center' }} className="muted">¿No tienes cuenta?</div>
            <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setMode('register')}>
              Registrarme como restaurante / chef
            </button>
          </div>
        ) : (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Crear cuenta</div>
            <div className="form-grid">
              <div className="field full"><label>Nombre / Restaurante <span className="req">*</span></label>
                <input value={reg.name} onChange={e => setR('name', e.target.value)} placeholder="Mi Restaurante" /></div>
              <div className="field"><label>Email <span className="req">*</span></label>
                <input type="email" value={reg.email} onChange={e => setR('email', e.target.value)} placeholder="tu@email.com" /></div>
              <div className="field"><label>Contraseña <span className="req">*</span></label>
                <input type="password" value={reg.password} onChange={e => setR('password', e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
              <div className="field"><label>Teléfono</label>
                <input value={reg.phone} onChange={e => setR('phone', e.target.value)} placeholder="+58 212 ..." /></div>
              <div className="field"><label>Persona de contacto</label>
                <input value={reg.contact} onChange={e => setR('contact', e.target.value)} placeholder="Nombre" /></div>
              <div className="field"><label>Instagram</label>
                <input value={reg.instagram} onChange={e => setR('instagram', e.target.value)} placeholder="@perfil" /></div>
              <div className="field full"><label>Dirección <span className="req">*</span></label>
                <input value={reg.address} onChange={e => setR('address', e.target.value)} placeholder="Av. Principal, Municipio, Ciudad" /></div>
              <div className="field full"><label>Coordenadas (para ordenar por cercanía)</label>
                <input value={reg.coords} onChange={e => setR('coords', e.target.value)} placeholder="Ej: 10.4806,-66.9036" />
                <span className="field-hint">Permite mostrarte primero los pedidos más cercanos a tu local.</span></div>
            </div>
            <button className="btn primary" style={{ width: '100%', marginTop: 16 }} onClick={doRegister} disabled={busy}>
              {busy ? 'Creando…' : 'Crear cuenta'}
            </button>
            <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setMode('login')}>
              Ya tengo cuenta
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

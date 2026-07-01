import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

export default function Nav() {
  const { profile, isAdmin, isShelter, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const name = profile?.name || ''
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  const close = () => setOpen(false)

  return (
    <nav className="nav">
      <NavLink to="/" className="nav-brand" onClick={close}>
        <img src="/logo.png" alt="PanasVE" className="nav-logo-img" />
        <span>PanasVE</span>
      </NavLink>

      {/* Botón hamburguesa (solo móvil) */}
      <button className="nav-burger" onClick={() => setOpen(o => !o)} aria-label="Menú" aria-expanded={open}>
        {open ? '✕' : '☰'}
      </button>

      {/* Menú: fila en desktop, desplegable en móvil */}
      <div className={`nav-menu ${open ? 'open' : ''}`}>
        <div className="nav-tabs">
          <NavLink to="/" end className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`} onClick={close}>
            {isShelter ? 'Mis pedidos' : 'Pedidos'}
          </NavLink>
          {isShelter && <NavLink to="/nuevo" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`} onClick={close}>Nuevo pedido</NavLink>}
          {profile && <NavLink to="/perfil" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`} onClick={close}>Mi perfil</NavLink>}
          {isAdmin && <NavLink to="/admin" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`} onClick={close}>Admin</NavLink>}
        </div>

        <div className="nav-right">
          <ThemeToggle />
          {profile ? (
            <>
              <div className="profile-badge">
                <span className="avatar">{initials}</span>
                <span className="profile-name" title={name}>{name}</span>
                {isAdmin && <span className="role-tag">admin</span>}
              </div>
              <button className="btn sm" onClick={handleSignOut}>Salir</button>
            </>
          ) : (
            <NavLink to="/login" className="btn sm" onClick={close}>Iniciar sesión</NavLink>
          )}
        </div>
      </div>
    </nav>
  )
}

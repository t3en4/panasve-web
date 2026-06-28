import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Nav() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="nav">
      <NavLink to="/" className="nav-brand">
        <span className="nav-logo" aria-hidden="true">🇻🇪</span>
        <span>PanasVE</span>
      </NavLink>

      <div className="nav-tabs">
        {!profile && (
          <>
            <NavLink to="/" end className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>Pedidos</NavLink>
            <NavLink to="/nuevo" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>Nuevo pedido</NavLink>
          </>
        )}
        {profile && (
          <>
            <NavLink to="/" end className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>Pedidos cercanos</NavLink>
            <NavLink to="/perfil" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>Mi perfil</NavLink>
            {isAdmin && <NavLink to="/admin" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>Admin</NavLink>}
          </>
        )}
      </div>

      <div className="nav-right">
        {profile ? (
          <>
            <div className="profile-badge">
              <span className="avatar">{initials}</span>
              <span>{profile.name?.split(' ')[0]}</span>
              {isAdmin && <span className="role-tag">admin</span>}
            </div>
            <button className="btn sm" onClick={handleSignOut}>Salir</button>
          </>
        ) : (
          <NavLink to="/login" className="btn sm">Soy restaurante / chef</NavLink>
        )}
      </div>
    </nav>
  )
}

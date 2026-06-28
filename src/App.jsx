import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Nav from './components/Nav'
import Orders from './pages/Orders'
import NewOrder from './pages/NewOrder'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="loading">Cargando…</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <div className="loading">Cargando…</div>
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function Shell() {
  const { loading } = useAuth()
  if (loading) return <div className="loading">Cargando PanasVE…</div>
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Orders />} />
        <Route path="/nuevo" element={<NewOrder />} />
        <Route path="/editar/:id" element={<NewOrder />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<ResetPassword />} />
        <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

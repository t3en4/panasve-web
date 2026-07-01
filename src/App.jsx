import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Nav from './components/Nav'
import PreviewBanner from './components/PreviewBanner'
import Feedback from './components/Feedback'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
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
      <PreviewBanner />
      <Nav />
      <Routes>
        <Route path="/" element={<Orders />} />
        <Route path="/pedido/:id" element={<OrderDetail />} />
        <Route path="/nuevo" element={<NewOrder />} />
        <Route path="/editar/:id" element={<NewOrder />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<ResetPassword />} />
        <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="site-footer">
        <span>PanasVE · Conectamos ayuda con quien la necesita</span>
        <a href="https://instagram.com/panasve" target="_blank" rel="noreferrer" className="footer-ig">📷 @panasve</a>
      </footer>
      <Feedback />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Shell />
          <Analytics />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

// Barra fija que aparece cuando el admin está previsualizando como otro rol.
export default function PreviewBanner() {
  const { isPreview, previewRole, setPreviewRole } = useAuth()
  const navigate = useNavigate()
  if (!isPreview) return null

  const label = previewRole === 'provider' ? 'proveedor' : 'solicitante'

  function salir() {
    setPreviewRole(null)
    navigate('/admin')
  }

  return (
    <div className="preview-banner">
      <span>👁️ Estás viendo la app como <strong>{label}</strong> · solo lectura</span>
      <button onClick={salir}>Salir de la vista</button>
    </div>
  )
}

import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

// Barra fija cuando el admin está previsualizando (rol genérico o cuenta específica).
export default function PreviewBanner() {
  const { isPreview, previewRole, previewName, exitPreview } = useAuth()
  const navigate = useNavigate()
  if (!isPreview) return null

  const quien = previewName
    ? previewName
    : (previewRole === 'provider' ? 'proveedor' : 'solicitante')

  function salir() {
    exitPreview()
    navigate('/admin')
  }

  return (
    <div className="preview-banner">
      <span>👁️ Estás viendo la app como <strong>{quien}</strong> · solo lectura</span>
      <button onClick={salir}>Salir de la vista</button>
    </div>
  )
}

// Punto de color según el estado del pedido + leyenda reutilizable.
const LABELS = { pending: 'Pendiente', progress: 'En progreso', done: 'Entregado', cancelled: 'Cancelado' }

export function StatusDot({ status }) {
  return <span className={`status-dot ${status}`} title={LABELS[status] || ''} aria-label={LABELS[status] || ''} />
}

export function StatusLegend({ compact }) {
  return (
    <div className={`status-legend ${compact ? 'compact' : ''}`}>
      <span><i className="status-dot pending" /> Pendiente</span>
      <span><i className="status-dot progress" /> En progreso</span>
      <span><i className="status-dot done" /> Entregado</span>
    </div>
  )
}

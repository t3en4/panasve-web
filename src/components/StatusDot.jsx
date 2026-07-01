import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

// Punto de color según el estado del pedido + leyenda reutilizable.
const LABELS = { pending: 'Pendiente', progress: 'En progreso', done: 'Entregado', cancelled: 'Cancelado' }

export function StatusDot({ status }) {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)   // {x, y} en coords de viewport
  const label = LABELS[status] || ''

  function show() {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setTip({ x: r.left + r.width / 2, y: r.top })
  }
  function hide() { setTip(null) }

  return (
    <>
      <span
        ref={ref}
        className={`status-dot ${status}`}
        title={label}
        aria-label={label}
        role="img"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
      />
      {tip && createPortal(
        <span className="status-tip" style={{ left: tip.x, top: tip.y }}>{label}</span>,
        document.body
      )}
    </>
  )
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

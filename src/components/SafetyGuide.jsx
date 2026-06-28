import { useState } from 'react'
import { REGLAS_ORO, REGLAS_ORO_NOTA, SEGURIDAD_ALIMENTARIA } from '../lib/constants'

export default function SafetyGuide() {
  const [open, setOpen] = useState(false)
  const { peligro, condimentos } = SEGURIDAD_ALIMENTARIA

  return (
    <div className="card safety-card">
      <button className="safety-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>🛡️ Guía de seguridad alimentaria</span>
        <span className="safety-chevron">{open ? '▾' : '▸'}</span>
      </button>
      <div className="card-sub" style={{ marginTop: 4 }}>
        Buenas prácticas para que la comida llegue segura a quien la recibe.
      </div>

      {open && (
        <div className="safety-body">
          {/* La espera es el peligro */}
          <div className="safety-section">
            <div className="safety-h">{peligro.titulo}</div>
            {peligro.parrafos.map((p, i) => <p key={i} className="safety-p">{p}</p>)}
            <div className="danger-bar" aria-hidden="true">
              <div className="danger-bar-zone" />
              <div className="danger-bar-labels"><span>0°C</span><span>60°C</span><span>100°C</span></div>
            </div>
            <div className="safety-warn">⚠️ {peligro.nota}</div>
          </div>

          {/* Reglas de oro */}
          <div className="safety-section">
            <div className="safety-h">Reglas de oro</div>
            <ul className="reglas-list">
              {REGLAS_ORO.map((r, i) => (
                <li key={i}><strong>{r.titulo}:</strong> {r.texto}</li>
              ))}
            </ul>
            <div className="reglas-nota">{REGLAS_ORO_NOTA}</div>
          </div>

          {/* Condimentos */}
          <div className="safety-section">
            <div className="safety-h">Cuidado con los condimentos</div>
            {condimentos.map((c, i) => (
              <div key={i} className={`condimento ${c.nivel}`}>
                <div className="condimento-head">
                  <span className="condimento-name">{c.nombre}</span>
                  <span className={`condimento-tag ${c.nivel}`}>{c.etiqueta}</span>
                </div>
                <p className="safety-p" style={{ margin: 0 }}>{c.texto}</p>
              </div>
            ))}
          </div>

          <div className="safety-fuente">{SEGURIDAD_ALIMENTARIA.fuente}</div>
        </div>
      )}
    </div>
  )
}

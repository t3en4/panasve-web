import { useState } from 'react'

export default function CoordsHelp() {
  const [open, setOpen] = useState(false)
  return (
    <span className="coords-help">
      <button type="button" className="coords-help-btn" onClick={() => setOpen(o => !o)} aria-label="Cómo obtener coordenadas">
        ¿Cómo obtengo esto?
      </button>
      {open && (
        <div className="coords-help-box">
          <button className="coords-help-close" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
          <strong>Para obtener tu ubicación exacta:</strong>
          <ol>
            <li>Abre <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a> y busca tu dirección.</li>
            <li>Haz <b>clic derecho</b> sobre el punto exacto en el mapa (o mantén presionado en el celular).</li>
            <li>Aparecerán las coordenadas arriba del menú (algo como <code>10.4806, -66.9036</code>).</li>
            <li>Tócalas para copiarlas y pégalas aquí.</li>
          </ol>
          <div className="coords-help-note">
            ⚠️ El botón <b>"Compartir"</b> de Google Maps da un enlace corto (maps.app.goo.gl) que <b>no funciona</b> aquí. Usa las coordenadas o el enlace largo de la barra de direcciones.
          </div>
        </div>
      )}
    </span>
  )
}

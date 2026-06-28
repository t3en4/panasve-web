import { useEffect, useRef, useState } from 'react'

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

// Carga el script de Google Maps una sola vez
let mapsPromise = null
function loadMaps() {
  if (mapsPromise) return mapsPromise
  mapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}`
    s.async = true
    s.onload = () => resolve(window.google.maps)
    s.onerror = () => reject(new Error('No se pudo cargar Google Maps'))
    document.head.appendChild(s)
  })
  return mapsPromise
}

export default function OrdersMap({ center, markers }) {
  const ref = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!KEY) { setError('falta_key'); return }
    if (center?.lat == null) { setError('sin_ubicacion'); return }

    let map
    loadMaps().then(maps => {
      map = new maps.Map(ref.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })

      // Marcador del proveedor (su ubicación)
      new maps.Marker({
        position: { lat: center.lat, lng: center.lng },
        map,
        title: 'Tu ubicación',
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#185fa5',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      })

      const info = new maps.InfoWindow()
      const bounds = new maps.LatLngBounds()
      bounds.extend({ lat: center.lat, lng: center.lng })

      // Marcadores de pedidos cercanos
      ;(markers || []).forEach(m => {
        if (m.lat == null) return
        const marker = new maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map,
          title: m.title,
        })
        marker.addListener('click', () => {
          info.setContent(
            `<div style="font-family:sans-serif;font-size:13px;max-width:200px">
               <strong>${m.title}</strong><br>${m.subtitle || ''}
             </div>`
          )
          info.open(map, marker)
        })
        bounds.extend({ lat: m.lat, lng: m.lng })
      })

      if ((markers || []).filter(m => m.lat != null).length > 0) {
        map.fitBounds(bounds)
        // No acercar demasiado si solo hay un punto
        maps.event.addListenerOnce(map, 'idle', () => {
          if (map.getZoom() > 14) map.setZoom(14)
        })
      }
    }).catch(() => setError('carga'))
  }, [center, markers])

  if (error === 'falta_key') {
    return <div className="map-msg">El mapa no está configurado todavía.</div>
  }
  if (error === 'sin_ubicacion') {
    return <div className="map-msg">Agrega tus coordenadas (arriba) para ver el mapa de pedidos cercanos.</div>
  }
  if (error === 'carga') {
    return <div className="map-msg">No se pudo cargar el mapa. Revisa tu conexión.</div>
  }

  return <div ref={ref} className="orders-map" />
}

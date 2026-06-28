import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisa tu archivo .env')
}

export const supabase = createClient(url, anonKey)

// Distancia entre dos coordenadas (km) — fórmula de Haversine
export function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v == null)) return null
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Extrae lat,lng de un texto pegado (coordenadas o link de Google Maps)
export function parseCoords(text) {
  if (!text) return { lat: null, lng: null }
  const t = text.trim()

  // Formato 1: enlace de Google Maps con "@lat,lng,zoom"
  //   ej: https://www.google.com/maps/@10.4806,-66.9036,15z
  let m = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Formato 2: enlace con "q=lat,lng" o "query=lat,lng" o "ll=lat,lng"
  //   ej: https://maps.google.com/?q=10.4806,-66.9036
  m = t.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Formato 3: enlace con "!3dLAT!4dLNG" (a veces aparece en URLs de Maps)
  m = t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Formato 4: coordenadas pegadas directamente "lat,lng" o "lat lng"
  m = t.match(/(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  return { lat: null, lng: null }
}

// ¿El texto parece un link corto de Google Maps (sin coordenadas extraíbles)?
export function isShortMapsLink(text) {
  if (!text) return false
  return /maps\.app\.goo\.gl|goo\.gl\/maps/.test(text)
}

export function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-VE') + ' ' + d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}
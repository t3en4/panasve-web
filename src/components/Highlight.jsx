import { normalizeText } from '../lib/constants'

// Resalta las coincidencias de `terms` dentro de `text`.
// Comparación acento- y mayúscula-insensible. Si la normalización cambia la
// longitud (caso raro con texto ya descompuesto), cae a comparación por
// minúsculas para no desalinear los índices con el texto original.
export default function Highlight({ text, terms }) {
  if (!terms?.length || !text) return <>{text}</>
  const norm = normalizeText(text)
  const aligned = norm.length === text.length
  const hay = aligned ? norm : text.toLowerCase()
  const needle = (t) => (aligned ? normalizeText(t) : (t || '').toLowerCase())

  const ranges = []
  for (const t of terms) {
    const nt = needle(t)
    if (!nt) continue
    let i = 0
    while ((i = hay.indexOf(nt, i)) !== -1) { ranges.push([i, i + nt.length]); i += nt.length }
  }
  if (!ranges.length) return <>{text}</>

  ranges.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }

  const parts = []
  let pos = 0
  merged.forEach(([s, e], idx) => {
    if (s > pos) parts.push(<span key={'t' + idx}>{text.slice(pos, s)}</span>)
    parts.push(<mark key={'m' + idx} className="hl">{text.slice(s, e)}</mark>)
    pos = e
  })
  if (pos < text.length) parts.push(<span key="tail">{text.slice(pos)}</span>)
  return <>{parts}</>
}

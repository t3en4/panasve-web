import { useState, useEffect } from 'react'

// Alterna entre tema oscuro (por defecto) y claro. Persiste en localStorage.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('panasve-theme') || 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') root.setAttribute('data-theme', 'light')
    else root.removeAttribute('data-theme')
    try { localStorage.setItem('panasve-theme', theme) } catch { /* noop */ }
  }, [theme])

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      aria-label="Cambiar tema"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}

import { useState, useEffect, useRef } from 'react'

// Número que sube desde 0 hasta el valor final, con easing suave.
export default function CountUp({ value = 0, duration = 1100, className }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef()

  useEffect(() => {
    const target = Number(value) || 0
    if (target === 0) { setDisplay(0); return }
    let raf
    const start = performance.now()
    const from = 0
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)   // easeOutCubic
      setDisplay(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <span ref={ref} className={className}>{display.toLocaleString('es-VE')}</span>
}

import { useState, useEffect } from 'react'

// Hook: pagina un arreglo. resetKey reinicia a la página 1 cuando cambia (ej. al filtrar).
export function usePaged(items, pageSize = 10, resetKey = '') {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [resetKey])

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return { pageItems, page: safePage, setPage, totalPages, total }
}

// Controles de paginación. No se muestran si hay una sola página.
export default function Pagination({ page, totalPages, setPage, total }) {
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <button className="btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
      <span className="pagination-info">
        Página {page} de {totalPages}{total != null && ` · ${total} en total`}
      </span>
      <button className="btn sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
    </div>
  )
}

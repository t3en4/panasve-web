import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

import { useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import styles from './Toast.module.css'

function ToastItem({ toast, onDismiss, onClick }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 9000)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  const urgent = toast.type === 'follow_up_reminder'

  return (
    <div
      className={`${styles.toast} ${urgent ? styles.urgent : ''}`}
      onClick={() => onClick(toast)}
      role="alert"
    >
      <Bell size={18} className={styles.icon} />
      <div className={styles.content}>
        <div className={styles.title}>{toast.title}</div>
        {toast.message && <div className={styles.message}>{toast.message}</div>}
      </div>
      <button
        className={styles.close}
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id) }}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export default function ToastStack({ toasts, onDismiss, onClick }) {
  if (!toasts.length) return null
  return (
    <div className={styles.stack}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} onClick={onClick} />
      ))}
    </div>
  )
}

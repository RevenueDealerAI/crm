import { Inbox } from 'lucide-react'
import styles from './EmptyState.module.css'

export default function EmptyState({ icon: Icon = Inbox, title = 'No data', message }) {
  return (
    <div className={styles.container}>
      <Icon size={48} className={styles.icon} />
      <div className={styles.title}>{title}</div>
      {message && <div className={styles.message}>{message}</div>}
    </div>
  )
}

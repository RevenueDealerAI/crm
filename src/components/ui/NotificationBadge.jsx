import styles from './NotificationBadge.module.css'

export default function NotificationBadge({ count, children }) {
  return (
    <span className={styles.badge}>
      {children}
      {count > 0 && (
        <span className={styles.count}>{count > 99 ? '99+' : count}</span>
      )}
    </span>
  )
}

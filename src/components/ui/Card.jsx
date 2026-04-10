import styles from './Card.module.css'

export default function Card({ header, footer, children, className = '' }) {
  return (
    <div className={`${styles.card} ${className}`}>
      {header && <div className={styles.header}>{header}</div>}
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  )
}

import styles from './Badge.module.css'

const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  negotiating: 'Negotiating',
  won: 'Won',
  lost: 'Lost',
  dead: 'Dead',
}

export default function Badge({ status, className = '' }) {
  return (
    <span className={`${styles.badge} ${styles[status] || ''} ${className}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

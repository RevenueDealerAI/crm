import { Loader2 } from 'lucide-react'
import styles from './Spinner.module.css'

export default function Spinner({ size = 24 }) {
  return (
    <div className={styles.container}>
      <Loader2 size={size} className={styles.spinner} />
    </div>
  )
}

import { forwardRef } from 'react'
import styles from './Select.module.css'

const Select = forwardRef(function Select({
  label,
  children,
  className = '',
  ...props
}, ref) {
  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <select
        ref={ref}
        className={`${styles.select} ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  )
})

export default Select

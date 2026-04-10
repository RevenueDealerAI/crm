import { forwardRef } from 'react'
import styles from './Input.module.css'

const Input = forwardRef(function Input({
  label,
  error,
  helper,
  className = '',
  ...props
}, ref) {
  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        ref={ref}
        className={`${styles.input} ${error ? styles.inputError : ''} ${className}`}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
      {!error && helper && <span className={styles.helper}>{helper}</span>}
    </div>
  )
})

export default Input

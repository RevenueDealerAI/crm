import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import Button from './ui/Button'
import styles from './LeadFilters.module.css'

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'dead', label: 'Dead' },
]

const TAGS = [
  { value: 'spanish', label: 'Spanish' },
  { value: 'incompatible', label: 'Incompatible' },
  { value: 'small_part', label: 'Small Part' },
  { value: 'abused', label: 'Abused' },
  { value: 'no_voice', label: 'No Voice' },
  { value: 'old_cx', label: 'Old Customer' },
]

export default function LeadFilters({ filters, onChange, reps, showRepFilter }) {
  const [searchInput, setSearchInput] = useState(filters.search || '')
  const debounceRef = useRef(null)

  useEffect(() => {
    setSearchInput(filters.search || '')
  }, [filters.search])

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: val || undefined })
    }, 300)
  }, [filters, onChange])

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  function toggleStatus(value) {
    const current = filters.statuses || []
    const next = current.includes(value)
      ? current.filter((s) => s !== value)
      : [...current, value]
    onChange({ ...filters, statuses: next.length ? next : undefined })
  }

  function toggleTag(value) {
    const current = filters.tags || []
    const next = current.includes(value)
      ? current.filter((t) => t !== value)
      : [...current, value]
    onChange({ ...filters, tags: next.length ? next : undefined })
  }

  function handleRepChange(e) {
    const val = e.target.value
    onChange({ ...filters, assignedTo: val || undefined })
  }

  function handleDateFrom(e) {
    onChange({ ...filters, dateFrom: e.target.value || undefined })
  }

  function handleDateTo(e) {
    onChange({ ...filters, dateTo: e.target.value || undefined })
  }

  const hasFilters = filters.search || filters.statuses?.length || filters.assignedTo ||
    filters.dateFrom || filters.dateTo || filters.tags?.length

  function clearAll() {
    setSearchInput('')
    onChange({})
  }

  return (
    <div className={styles.filters}>
      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search name, phone, vehicle, notes…"
            value={searchInput}
            onChange={handleSearchChange}
          />
          {searchInput && (
            <button
              className={styles.clearSearch}
              onClick={() => { setSearchInput(''); onChange({ ...filters, search: undefined }) }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </div>

      <div className={styles.filterRow}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status</span>
          <div className={styles.chips}>
            {STATUSES.map((s) => (
              <button
                key={s.value}
                className={`${styles.chip} ${(filters.statuses || []).includes(s.value) ? styles.chipActive : ''}`}
                onClick={() => toggleStatus(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {showRepFilter && reps && reps.length > 0 && (
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Rep</span>
            <select
              className={styles.filterSelect}
              value={filters.assignedTo || ''}
              onChange={handleRepChange}
            >
              <option value="">All Reps</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>{r.full_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Date Range</span>
          <div className={styles.dateRange}>
            <input
              type="date"
              className={styles.dateInput}
              value={filters.dateFrom || ''}
              onChange={handleDateFrom}
            />
            <span className={styles.dateSep}>to</span>
            <input
              type="date"
              className={styles.dateInput}
              value={filters.dateTo || ''}
              onChange={handleDateTo}
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Tags</span>
          <div className={styles.chips}>
            {TAGS.map((t) => (
              <button
                key={t.value}
                className={`${styles.chip} ${(filters.tags || []).includes(t.value) ? styles.chipActive : ''}`}
                onClick={() => toggleTag(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import styles from './Table.module.css'

function SortIcon({ direction }) {
  if (direction === 'asc') return <ArrowUp size={14} />
  if (direction === 'desc') return <ArrowDown size={14} />
  return <ArrowUpDown size={14} />
}

export default function Table({ columns, data, sortColumn, sortDirection, onSort, onRowClick }) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.sortable ? styles.sortable : ''}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
              >
                {col.label}
                {col.sortable && (
                  <span className={styles.sortIcon}>
                    <SortIcon direction={sortColumn === col.key ? sortDirection : null} />
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

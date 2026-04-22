import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Phone, User } from 'lucide-react'
import styles from './KanbanCard.module.css'

export default function KanbanCard({ lead, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const vehicle = [lead.vehicle_year, lead.vehicle_make, lead.vehicle_model]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(lead)}
    >
      <div className={styles.name}>{lead.customer_name || 'Unknown'}</div>
      {vehicle && <div className={styles.vehicle}>{vehicle}</div>}
      <div className={styles.meta}>
        {lead.phone && (
          <span className={styles.metaItem}>
            <Phone size={12} />
            {lead.phone}
          </span>
        )}
        <span className={styles.metaItem}>
          <User size={12} />
          {lead.profiles?.full_name || 'Unassigned'}
        </span>
      </div>
    </div>
  )
}

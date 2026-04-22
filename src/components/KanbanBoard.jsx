import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import Badge from './ui/Badge'
import KanbanCard from './KanbanCard'
import Spinner from './ui/Spinner'
import EmptyState from './ui/EmptyState'
import styles from './KanbanBoard.module.css'

const STATUSES = [
  'new',
  'contacted',
  'quoted',
  'negotiating',
  'won',
  'lost',
  'dead',
]

function Column({ status, leads, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const ids = leads.map((l) => l.id)

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <Badge status={status} />
        <span className={styles.columnCount}>{leads.length}</span>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`${styles.columnBody} ${isOver ? styles.columnOver : ''}`}
        >
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} onClick={onCardClick} />
          ))}
          {leads.length === 0 && (
            <div className={styles.emptyColumn}>No leads</div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function KanbanBoard({
  leads,
  loading,
  filters,
  onStatusChange,
  onCardClick,
}) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const grouped = {}
  for (const s of STATUSES) {
    grouped[s] = []
  }
  for (const lead of leads) {
    if (grouped[lead.status]) {
      grouped[lead.status].push(lead)
    }
  }

  const activeLead = activeId
    ? leads.find((l) => l.id === activeId)
    : null

  function handleDragStart(event) {
    setActiveId(event.active.id)
  }

  function handleDragEnd(event) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    let targetStatus = null

    if (STATUSES.includes(over.id)) {
      targetStatus = over.id
    } else {
      const overLead = leads.find((l) => l.id === over.id)
      if (overLead) {
        targetStatus = overLead.status
      }
    }

    if (targetStatus && targetStatus !== lead.status) {
      onStatusChange(leadId, targetStatus)
    }
  }

  if (loading) return <Spinner />

  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads found"
        message={
          Object.keys(filters || {}).length > 0
            ? 'Try adjusting your filters.'
            : 'Create your first lead to get started.'
        }
      />
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            leads={grouped[status]}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <KanbanCard lead={activeLead} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

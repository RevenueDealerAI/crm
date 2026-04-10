import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import Layout from '../components/ui/Layout'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import LeadForm from '../components/LeadForm'
import { useAuth } from '../context/AuthContext'
import { getLeadById, updateLead, deleteLead } from '../lib/leads'
import styles from './LeadDetail.module.css'

const PIPELINE_STAGES = ['new', 'contacted', 'quoted', 'negotiating']
const TERMINAL_STAGES = ['won', 'lost', 'dead']
const ALL_STAGES = [...PIPELINE_STAGES, ...TERMINAL_STAGES]

const STAGE_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  negotiating: 'Negotiating',
  won: 'Won',
  lost: 'Lost',
  dead: 'Dead',
}

function stageIndex(status) {
  return PIPELINE_STAGES.indexOf(status)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatActivityEntry(entry) {
  const who = entry.profiles?.full_name || 'System'
  if (entry.action === 'status_change') {
    return `${who} changed status from ${STAGE_LABELS[entry.old_value] || entry.old_value} to ${STAGE_LABELS[entry.new_value] || entry.new_value}`
  }
  if (entry.action === 'assigned') {
    return `Lead assigned to ${who}`
  }
  return `${who}: ${entry.action}`
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isManager = profile?.role === 'manager'

  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmStage, setConfirmStage] = useState(null)
  const [notes, setNotes] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchLead() {
    setLoading(true)
    try {
      const data = await getLeadById(id)
      setLead(data)
      setNotes(data.notes || '')
      setFollowUp(data.follow_up_date || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLead()
  }, [id])

  async function handleStageClick(stage) {
    if (stage === lead.status) return
    if (TERMINAL_STAGES.includes(stage)) {
      setConfirmStage(stage)
      return
    }
    await changeStatus(stage)
  }

  async function changeStatus(newStatus) {
    try {
      await updateLead(id, { status: newStatus })
      setConfirmStage(null)
      await fetchLead()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSaveNotes() {
    setSaving(true)
    try {
      await updateLead(id, { notes, follow_up_date: followUp || null })
      await fetchLead()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(formData) {
    setEditLoading(true)
    try {
      await updateLead(id, formData)
      setEditOpen(false)
      await fetchLead()
    } catch (err) {
      setError(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete() {
    try {
      await deleteLead(id)
      navigate('/leads')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <Layout title="Lead Detail"><Spinner size={32} /></Layout>
  if (!lead) return <Layout title="Lead Detail"><div className={styles.errorBanner}>Lead not found</div></Layout>

  const currentIdx = stageIndex(lead.status)
  const isTerminal = TERMINAL_STAGES.includes(lead.status)
  const activities = lead.activity_log || []
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )

  return (
    <Layout title="Lead Detail">
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
            <ArrowLeft size={16} /> Back
          </Button>
          <span className={styles.customerName}>{lead.customer_name || 'Unknown'}</span>
          <a href={`tel:${lead.phone}`} className={styles.phoneLink}>{lead.phone}</a>
          <Badge status={lead.status} />
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Edit size={14} /> Edit
          </Button>
          {isManager && (
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={14} /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className={styles.pipeline}>
        {PIPELINE_STAGES.map((stage, idx) => {
          let cls = styles.pipelineStep
          if (stage === lead.status) cls = styles.pipelineStepActive
          else if (!isTerminal && idx < currentIdx) cls = styles.pipelineStepCompleted
          return (
            <button key={stage} className={cls} onClick={() => handleStageClick(stage)}>
              {STAGE_LABELS[stage]}
            </button>
          )
        })}
        <span style={{ width: 1, background: 'var(--color-gray-300)', margin: '0 var(--space-1)' }} />
        {TERMINAL_STAGES.map((stage) => (
          <button
            key={stage}
            className={stage === lead.status ? styles.pipelineStepActive : styles.pipelineTerminal}
            onClick={() => handleStageClick(stage)}
          >
            {STAGE_LABELS[stage]}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        <Card header="Vehicle Information" className={styles.infoCard}>
          <div className={styles.infoGrid}>
            <div>
              <div className={styles.infoLabel}>Year</div>
              <div className={styles.infoValue}>{lead.vehicle_year || '—'}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Make</div>
              <div className={styles.infoValue}>{lead.vehicle_make || '—'}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Model</div>
              <div className={styles.infoValue}>{lead.vehicle_model || '—'}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Part Needed</div>
              <div className={styles.infoValue}>{lead.part_needed || '—'}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Part Detail</div>
              <div className={styles.infoValue}>{lead.part_detail || '—'}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Mileage</div>
              <div className={styles.infoValue}>{lead.mileage || '—'}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Price Quoted</div>
              <div className={styles.infoValue}>{lead.price_quoted ? `$${lead.price_quoted}` : '—'}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Warranty</div>
              <div className={styles.infoValue}>{lead.warranty_info || '—'}</div>
            </div>
          </div>
          {lead.tags && lead.tags.length > 0 && (
            <div className={styles.tagsRow}>
              {lead.tags.map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </Card>

        <Card header="Notes & Follow-up" className={styles.notesSection}>
          <textarea
            className={styles.notesTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this lead..."
          />
          <div className={styles.followUpRow}>
            <span className={styles.followUpLabel}>Follow-up:</span>
            <input
              type="date"
              className={styles.followUpInput}
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
            <Button size="sm" onClick={handleSaveNotes} loading={saving}>Save</Button>
          </div>
        </Card>
      </div>

      <div className={styles.timeline}>
        <h2 className={styles.timelineTitle}>Activity Timeline</h2>
        {sortedActivities.length > 0 ? (
          <div className={styles.timelineList}>
            {sortedActivities.map((entry) => (
              <div key={entry.id} className={styles.timelineItem}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineContent}>{formatActivityEntry(entry)}</div>
                <div className={styles.timelineMeta}>{formatDateTime(entry.created_at)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-sm)' }}>No activity recorded yet.</p>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Lead">
        <LeadForm
          initial={lead}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
          loading={editLoading}
        />
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Lead">
        <div className={styles.confirmBody}>
          Are you sure you want to delete <strong>{lead.customer_name}</strong>? This cannot be undone.
        </div>
        <div className={styles.confirmActions}>
          <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      <Modal
        open={!!confirmStage}
        onClose={() => setConfirmStage(null)}
        title={`Mark as ${STAGE_LABELS[confirmStage] || ''}`}
      >
        <div className={styles.confirmBody}>
          Mark this lead as <strong>{STAGE_LABELS[confirmStage] || confirmStage}</strong>?
          This is a terminal status.
        </div>
        <div className={styles.confirmActions}>
          <Button variant="secondary" size="sm" onClick={() => setConfirmStage(null)}>Cancel</Button>
          <Button
            variant={confirmStage === 'won' ? 'primary' : 'danger'}
            size="sm"
            onClick={() => changeStatus(confirmStage)}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </Layout>
  )
}

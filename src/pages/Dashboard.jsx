import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { X, TrendingUp, Clock, FileText, Trophy } from 'lucide-react'
import Layout from '../components/ui/Layout'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { updateLead } from '../lib/leads'
import useDashboardData from '../hooks/useDashboardData'
import styles from './Dashboard.module.css'

const LEAD_STATUSES = ['new', 'contacted', 'quoted', 'negotiating', 'won', 'lost', 'dead']

function DailySummaryCard() {
  const { notifications, markAsRead } = useNotifications()

  const todaySummary = notifications.find(
    (n) =>
      n.type === 'daily_summary' &&
      !n.is_read &&
      new Date(n.created_at).toDateString() === new Date().toDateString()
  )

  if (!todaySummary) return null

  return (
    <Card className={styles.summaryCard}>
      <div className={styles.summaryBody}>
        <div className={styles.summaryText}>{todaySummary.message}</div>
        <button
          className={styles.dismissBtn}
          onClick={() => markAsRead(todaySummary.id)}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </Card>
  )
}

function StatusDropdown({ currentStatus, onSelect }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.statusDropdown}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <Badge status={currentStatus} />
      </button>
      {open && (
        <div className={styles.statusMenu}>
          {LEAD_STATUSES.map((s) => (
            <button
              key={s}
              className={styles.statusOption}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(s)
                setOpen(false)
              }}
            >
              <Badge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function daysOverdue(followUpDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fDate = new Date(followUpDate)
  fDate.setHours(0, 0, 0, 0)
  const diff = Math.floor((today - fDate) / (1000 * 60 * 60 * 24))
  return diff
}

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { stats, followUps, recentLeads, loading, error, refetch } = useDashboardData()

  async function handleStatusChange(leadId, newStatus) {
    try {
      await updateLead(leadId, { status: newStatus })
      refetch()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  if (loading) return <Layout title="Dashboard"><Spinner size={32} /></Layout>

  const followUpColumns = [
    { key: 'customer_name', label: 'Customer' },
    { key: 'phone', label: 'Phone' },
    { key: 'vehicle_year', label: 'Year', render: (v) => v || '—' },
    { key: 'vehicle_make', label: 'Make', render: (v) => v || '—' },
    { key: 'vehicle_model', label: 'Model', render: (v) => v || '—' },
    { key: 'part_needed', label: 'Part' },
    {
      key: 'follow_up_date',
      label: 'Follow-up Date',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '—'),
    },
    {
      key: 'overdue',
      label: 'Days Overdue',
      render: (_, row) => {
        const days = daysOverdue(row.follow_up_date)
        if (days === 0) return <span className={styles.dueToday}>Due today</span>
        return <span className={styles.overdue}>{days} day{days !== 1 ? 's' : ''} overdue</span>
      },
    },
  ]

  const recentColumns = [
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => new Date(val).toLocaleDateString(),
    },
    { key: 'customer_name', label: 'Customer' },
    { key: 'phone', label: 'Phone' },
    { key: 'vehicle_year', label: 'Year', render: (v) => v || '—' },
    { key: 'vehicle_make', label: 'Make', render: (v) => v || '—' },
    { key: 'vehicle_model', label: 'Model', render: (v) => v || '—' },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => (
        <StatusDropdown
          currentStatus={val}
          onSelect={(newStatus) => handleStatusChange(row.id, newStatus)}
        />
      ),
    },
  ]

  const statCards = [
    { label: 'My Active Leads', value: stats.active, icon: TrendingUp },
    { label: 'Follow-ups Due', value: stats.followUpsDue, icon: Clock },
    { label: 'Quoted This Week', value: stats.quotedWeek, icon: FileText },
    { label: 'Won This Month', value: stats.wonMonth, icon: Trophy },
  ]

  return (
    <Layout title="Dashboard">
      <DailySummaryCard />

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.statsGrid}>
        {statCards.map((s) => (
          <Card key={s.label} className={styles.statCard}>
            <s.icon size={20} style={{ color: 'var(--color-gray-400)', marginBottom: 'var(--space-2)' }} />
            <div className={styles.statNumber}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Follow-ups Due</h2>
        </div>
        {followUps.length > 0 ? (
          <Table
            columns={followUpColumns}
            data={followUps}
            onRowClick={(row) => navigate(`/leads/${row.id}`)}
          />
        ) : (
          <EmptyState title="No follow-ups due" message="You're all caught up!" />
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Leads</h2>
          <Link to="/leads" className={styles.viewAll}>View all →</Link>
        </div>
        {recentLeads.length > 0 ? (
          <Table
            columns={recentColumns}
            data={recentLeads}
            onRowClick={(row) => navigate(`/leads/${row.id}`)}
          />
        ) : (
          <EmptyState title="No leads yet" message="New leads will appear here when assigned to you." />
        )}
      </div>
    </Layout>
  )
}

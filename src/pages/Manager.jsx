import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, AlertCircle, Clock, Trophy, Zap } from 'lucide-react'
import Layout from '../components/ui/Layout'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { updateLead } from '../lib/leads'
import { assignLead } from '../lib/assignment'
import useManagerData from '../hooks/useManagerData'
import styles from './Manager.module.css'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatAction(entry) {
  const who = entry.profiles?.full_name || 'System'
  const action = entry.action || ''

  if (action === 'status_change') {
    return `${who} changed status from ${entry.old_value || '?'} to ${entry.new_value || '?'}`
  }
  if (action === 'assigned') {
    return `${who} was assigned a lead`
  }
  return `${who}: ${action}`
}

function RepAssignDropdown({ currentRep, reps, onAssign, onAutoAssign }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.assignDropdown}>
      <button
        className={styles.assignBtn}
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
      >
        {currentRep || 'Unassigned'}
      </button>
      {open && (
        <div className={styles.assignMenu}>
          {reps.map((rep) => (
            <button
              key={rep.id}
              className={styles.assignOption}
              onClick={(e) => {
                e.stopPropagation()
                onAssign(rep.id)
                setOpen(false)
              }}
            >
              {rep.full_name}
            </button>
          ))}
          {onAutoAssign && (
            <button
              className={styles.autoAssignOption}
              onClick={(e) => {
                e.stopPropagation()
                onAutoAssign()
                setOpen(false)
              }}
            >
              <Zap size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Auto-assign
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Manager() {
  const navigate = useNavigate()
  const { stats, repStats, activityFeed, leads, unassignedLeads, reps, loading, error, refetch } =
    useManagerData()
  const [repFilter, setRepFilter] = useState('')

  async function handleReassign(leadId, newRepId) {
    try {
      await updateLead(leadId, { assigned_to: newRepId })
      refetch()
    } catch (err) {
      console.error('Reassign failed:', err)
    }
  }

  async function handleAutoAssign(leadId) {
    try {
      await assignLead(leadId)
      refetch()
    } catch (err) {
      console.error('Auto-assign failed:', err)
    }
  }

  if (loading) return <Layout title="Manager Dashboard"><Spinner size={32} /></Layout>

  const filteredLeads = repFilter
    ? leads.filter((l) => l.assigned_to === repFilter)
    : leads

  const leadColumns = [
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => new Date(val).toLocaleDateString(),
    },
    { key: 'customer_name', label: 'Customer' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (_, row) =>
        [row.vehicle_year, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ') || '—',
    },
    { key: 'part_needed', label: 'Part' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <Badge status={val} />,
    },
    {
      key: 'assigned_to',
      label: 'Assigned To',
      render: (_, row) => (
        <RepAssignDropdown
          currentRep={row.profiles?.full_name}
          reps={reps}
          onAssign={(repId) => handleReassign(row.id, repId)}
        />
      ),
    },
  ]

  const unassignedColumns = [
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => new Date(val).toLocaleDateString(),
    },
    { key: 'customer_name', label: 'Customer' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (_, row) =>
        [row.vehicle_year, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ') || '—',
    },
    {
      key: 'assign',
      label: 'Assign',
      render: (_, row) => (
        <RepAssignDropdown
          currentRep={null}
          reps={reps}
          onAssign={(repId) => handleReassign(row.id, repId)}
          onAutoAssign={() => handleAutoAssign(row.id)}
        />
      ),
    },
  ]

  const statCards = [
    { label: 'Total Active Leads', value: stats.totalActive, icon: Users },
    { label: 'Unassigned', value: stats.unassigned, icon: AlertCircle },
    { label: 'Follow-ups Due', value: stats.followUpsDue, icon: Clock },
    { label: 'Won This Month', value: stats.wonMonth, icon: Trophy },
  ]

  return (
    <Layout title="Manager Dashboard">
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

      {repStats.length > 0 && (
        <div className={styles.repGrid}>
          {repStats.map((rep) => (
            <Card key={rep.id} className={styles.repCard}>
              <div className={styles.repName}>{rep.full_name}</div>
              <div className={styles.repCount}>{rep.activeCount}</div>
              <div className={styles.statLabel}>active leads</div>
            </Card>
          ))}
        </div>
      )}

      <div className={styles.twoCol}>
        <div>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>All Active Leads</h2>
            </div>
            <div className={styles.filterBar}>
              <span className={styles.filterLabel}>Show leads for:</span>
              <select
                className={styles.filterSelect}
                value={repFilter}
                onChange={(e) => setRepFilter(e.target.value)}
              >
                <option value="">All Reps</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>{rep.full_name}</option>
                ))}
              </select>
            </div>
            {filteredLeads.length > 0 ? (
              <Table
                columns={leadColumns}
                data={filteredLeads}
                onRowClick={(row) => navigate(`/leads/${row.id}`)}
              />
            ) : (
              <EmptyState title="No leads found" message="No active leads match the current filter." />
            )}
          </div>
        </div>

        <div>
          <Card header="Team Activity">
            {activityFeed.length > 0 ? (
              <div className={styles.activityFeed}>
                {activityFeed.map((entry) => (
                  <div key={entry.id} className={styles.activityItem}>
                    <div className={styles.activityAction}>{formatAction(entry)}</div>
                    <div className={styles.activityMeta}>{timeAgo(entry.created_at)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No activity yet" />
            )}
          </Card>
        </div>
      </div>

      {unassignedLeads.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Unassigned Leads</h2>
          </div>
          <Table
            columns={unassignedColumns}
            data={unassignedLeads}
            onRowClick={(row) => navigate(`/leads/${row.id}`)}
          />
        </div>
      )}
    </Layout>
  )
}

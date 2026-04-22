import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, LayoutGrid, List } from 'lucide-react'
import Layout from '../components/ui/Layout'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import LeadForm from '../components/LeadForm'
import LeadFilters from '../components/LeadFilters'
import KanbanBoard from '../components/KanbanBoard'
import { useAuth } from '../context/AuthContext'
import { getLeads, createLead, updateLead, deleteLead } from '../lib/leads'
import { supabase } from '../lib/supabase'
import styles from './Leads.module.css'

function parseFiltersFromParams(params) {
  const filters = {}
  const search = params.get('search')
  if (search) filters.search = search

  const statuses = params.get('status')
  if (statuses) filters.statuses = statuses.split(',')

  const assignedTo = params.get('rep')
  if (assignedTo) filters.assignedTo = assignedTo

  const dateFrom = params.get('from')
  if (dateFrom) filters.dateFrom = dateFrom

  const dateTo = params.get('to')
  if (dateTo) filters.dateTo = dateTo

  const tags = params.get('tags')
  if (tags) filters.tags = tags.split(',')

  return filters
}

function filtersToParams(filters) {
  const params = {}
  if (filters.search) params.search = filters.search
  if (filters.statuses?.length) params.status = filters.statuses.join(',')
  if (filters.assignedTo) params.rep = filters.assignedTo
  if (filters.dateFrom) params.from = filters.dateFrom
  if (filters.dateTo) params.to = filters.dateTo
  if (filters.tags?.length) params.tags = filters.tags.join(',')
  return params
}

export default function Leads() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 25

  const [filters, setFilters] = useState(() => parseFiltersFromParams(searchParams))
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'created_at')
  const [sortDir, setSortDir] = useState(searchParams.get('sortDir') || 'desc')

  const [reps, setReps] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'table')

  const [kanbanLeads, setKanbanLeads] = useState([])
  const [kanbanLoading, setKanbanLoading] = useState(false)

  const isManager = profile?.role === 'manager'

  useEffect(() => {
    if (!isManager) return
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'rep')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => { if (data) setReps(data) })
  }, [isManager])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getLeads({
        ...filters,
        sortBy,
        sortDir,
        page,
        pageSize,
      })
      setLeads(result.data || [])
      setCount(result.count || 0)
    } catch (err) {
      console.error('Failed to fetch leads:', err)
    } finally {
      setLoading(false)
    }
  }, [filters, sortBy, sortDir, page])

  const fetchKanbanLeads = useCallback(async () => {
    setKanbanLoading(true)
    try {
      const result = await getLeads({
        ...filters,
        sortBy: 'created_at',
        sortDir: 'desc',
        page: 1,
        pageSize: 500,
      })
      setKanbanLeads(result.data || [])
      setCount(result.count || 0)
    } catch (err) {
      console.error('Failed to fetch kanban leads:', err)
    } finally {
      setKanbanLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchLeads() }, [fetchLeads])
  useEffect(() => {
    if (viewMode === 'kanban') fetchKanbanLeads()
  }, [viewMode, fetchKanbanLeads])

  useEffect(() => {
    const params = {
      ...filtersToParams(filters),
    }
    if (sortBy !== 'created_at') params.sortBy = sortBy
    if (sortDir !== 'desc') params.sortDir = sortDir
    if (viewMode !== 'table') params.view = viewMode
    setSearchParams(params, { replace: true })
  }, [filters, sortBy, sortDir, viewMode, setSearchParams])

  function handleFiltersChange(newFilters) {
    setFilters(newFilters)
    setPage(1)
  }

  function handleSort(column) {
    if (sortBy === column) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
    setPage(1)
  }

  async function handleCreate(data) {
    setSubmitting(true)
    try {
      await createLead({ ...data, created_by: profile.id, assigned_to: profile.id })
      setCreateOpen(false)
      fetchLeads()
    } catch (err) {
      console.error('Failed to create lead:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(data) {
    setSubmitting(true)
    try {
      await updateLead(editLead.id, data)
      setEditLead(null)
      fetchLeads()
    } catch (err) {
      console.error('Failed to update lead:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setSubmitting(true)
    try {
      await deleteLead(deleteTarget.id)
      setDeleteTarget(null)
      fetchLeads()
    } catch (err) {
      console.error('Failed to delete lead:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(leadId, newStatus) {
    setKanbanLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    )
    try {
      await updateLead(leadId, { status: newStatus })
    } catch (err) {
      console.error('Failed to update status:', err)
      fetchKanbanLeads()
    }
  }

  function switchView(mode) {
    setViewMode(mode)
  }

  const totalPages = Math.ceil(count / pageSize)

  const columns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (v) => v ? new Date(v).toLocaleDateString() : '—',
    },
    {
      key: 'customer_name',
      label: 'Customer',
      sortable: true,
      render: (v) => v || '—',
    },
    { key: 'phone', label: 'Phone' },
    {
      key: 'vehicle_year',
      label: 'Vehicle',
      render: (_, row) => {
        const parts = [row.vehicle_year, row.vehicle_make, row.vehicle_model].filter(Boolean)
        return parts.length ? <span className={styles.vehicle}>{parts.join(' ')}</span> : '—'
      },
    },
    { key: 'part_needed', label: 'Part', render: (v) => v || '—' },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (v) => <Badge status={v} />,
    },
    {
      key: 'assigned_to',
      label: 'Rep',
      sortable: true,
      render: (_, row) => row.profiles?.full_name || 'Unassigned',
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setEditLead(row) }}
          >
            <Pencil size={14} />
          </Button>
          {isManager && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(row) }}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <Layout title="Leads">
      <div className={styles.header}>
        <span className={styles.count}>{count} lead{count !== 1 ? 's' : ''}</span>
        <div className={styles.headerActions}>
          <div className={styles.viewToggle}>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => switchView('table')}
            >
              <List size={16} />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => switchView('kanban')}
            >
              <LayoutGrid size={16} />
            </Button>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New Lead
          </Button>
        </div>
      </div>

      <LeadFilters
        filters={filters}
        onChange={handleFiltersChange}
        reps={reps}
        showRepFilter={isManager}
      />

      {viewMode === 'kanban' ? (
        <KanbanBoard
          leads={kanbanLeads}
          loading={kanbanLoading}
          filters={filters}
          onStatusChange={handleStatusChange}
          onCardClick={(lead) => navigate(`/leads/${lead.id}`)}
        />
      ) : loading ? (
        <Spinner />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads found"
          message={Object.keys(filters).length > 0
            ? 'Try adjusting your filters.'
            : 'Create your first lead to get started.'}
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={leads}
            sortColumn={sortBy}
            sortDirection={sortDir}
            onSort={handleSort}
            onRowClick={(row) => navigate(`/leads/${row.id}`)}
          />
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <span>Page {page} of {totalPages}</span>
              <div className={styles.paginationBtns}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Lead"
      >
        <LeadForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          loading={submitting}
        />
      </Modal>

      <Modal
        open={!!editLead}
        onClose={() => setEditLead(null)}
        title="Edit Lead"
      >
        {editLead && (
          <LeadForm
            initial={editLead}
            onSubmit={handleEdit}
            onCancel={() => setEditLead(null)}
            loading={submitting}
          />
        )}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Lead"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={submitting}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete the lead for{' '}
          <strong>{deleteTarget?.customer_name || 'this customer'}</strong>?
          This action cannot be undone.
        </p>
      </Modal>
    </Layout>
  )
}

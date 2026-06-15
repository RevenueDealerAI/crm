import { useState, useRef } from 'react'
import { Upload, Download, ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  parseLeadsCsv,
  findExistingMetaIds,
  importLeads,
  buildTemplateCsv,
  REQUIRED_COLUMNS,
} from '../lib/csvImport'
import styles from './CsvImportModal.module.css'

const STEP_PICK = 'pick'
const STEP_PREVIEW = 'preview'
const STEP_IMPORTING = 'importing'
const STEP_DONE = 'done'

export default function CsvImportModal({ open, onClose, onImported }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [step, setStep] = useState(STEP_PICK)
  const [fileName, setFileName] = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [profileMap, setProfileMap] = useState({})
  const [duplicateIds, setDuplicateIds] = useState(new Set())
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showFormat, setShowFormat] = useState(false)

  function reset() {
    setStep(STEP_PICK)
    setFileName('')
    setParseResult(null)
    setProfileMap({})
    setDuplicateIds(new Set())
    setProgress({ done: 0, total: 0 })
    setImportResult(null)
    setError('')
    setBusy(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    if (busy) return
    reset()
    onClose()
  }

  async function handleFile(file) {
    if (!file) return
    setError('')
    setBusy(true)
    setFileName(file.name)
    try {
      const text = await file.text()
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('is_active', true)
      if (pErr) throw new Error(`Failed to load profiles: ${pErr.message}`)
      const idMap = {}
      for (const p of profiles) idMap[p.id] = p.full_name
      setProfileMap(idMap)
      const result = parseLeadsCsv(text, profiles, user?.id)
      if (result.error) {
        setError(result.error)
        setBusy(false)
        return
      }
      const metaIds = result.leads.map((l) => l._metaId).filter(Boolean)
      const existing = await findExistingMetaIds(metaIds)
      setDuplicateIds(existing)
      setParseResult(result)
      setStep(STEP_PREVIEW)
    } catch (err) {
      setError(err.message || 'Failed to read file')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport() {
    if (!parseResult) return
    const toImport = parseResult.leads.filter((l) => !duplicateIds.has(l._metaId))
    setStep(STEP_IMPORTING)
    setBusy(true)
    setProgress({ done: 0, total: toImport.length })
    const result = await importLeads(toImport, setProgress)
    setImportResult({ ...result, attempted: toImport.length, duplicates: duplicateIds.size })
    setStep(STEP_DONE)
    setBusy(false)
    if (onImported) onImported()
  }

  function handleDownloadTemplate() {
    const csv = buildTemplateCsv()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const validCount = parseResult ? parseResult.leads.length : 0
  const dupCount = duplicateIds.size
  const newCount = validCount - dupCount

  const assignmentSummary = (() => {
    if (!parseResult) return null
    const counts = {}
    for (const { lead } of parseResult.leads) {
      const k = lead.assigned_to || 'UNASSIGNED'
      counts[k] = (counts[k] || 0) + 1
    }
    return counts
  })()

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Leads from CSV"
      maxWidth={720}
      footer={
        step === STEP_PICK ? (
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        ) : step === STEP_PREVIEW ? (
          <>
            <Button variant="secondary" onClick={reset} disabled={busy}>Choose another file</Button>
            <Button onClick={handleImport} disabled={busy || newCount === 0}>
              Import {newCount} lead{newCount === 1 ? '' : 's'}
            </Button>
          </>
        ) : step === STEP_IMPORTING ? null : (
          <Button onClick={handleClose}>Close</Button>
        )
      }
    >
      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {step === STEP_PICK && (
        <>
          <div className={styles.dropZone}>
            <Upload size={28} className={styles.uploadIcon} />
            <p className={styles.dropTitle}>Upload Meta Lead Ads export CSV</p>
            <p className={styles.dropHint}>Same format as the AutoParts Leads Dashboard export</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className={styles.fileInput}
              onChange={(e) => handleFile(e.target.files?.[0])}
              disabled={busy}
            />
            <Button onClick={() => fileInputRef.current?.click()} loading={busy}>
              Choose CSV file
            </Button>
          </div>

          <button className={styles.formatToggle} onClick={() => setShowFormat(!showFormat)}>
            {showFormat ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            CSV format
          </button>
          {showFormat && (
            <div className={styles.formatHelp}>
              <p>
                The CSV must have a header row and include these columns (extra columns are
                allowed and will be ignored except for the unnamed columns after <code>Agent Name</code>,
                which become notes):
              </p>
              <ul>
                {REQUIRED_COLUMNS.map((c) => <li key={c}><code>{c}</code></li>)}
              </ul>
              <p className={styles.formatNote}>Field handling:</p>
              <ul className={styles.compactList}>
                <li><code>id</code> → stored in <code>notes</code> as <code>meta_lead_id=...</code> (used for dedupe)</li>
                <li><code>created_time</code> → ISO timestamp; populates <code>date</code> and <code>created_at</code></li>
                <li><code>is_organic=true</code> → adds <code>organic</code> tag; <code>platform</code> (e.g. <code>fb</code>) → tag</li>
                <li><code>full_name</code> → <code>customer_name</code></li>
                <li><code>phone_number</code> or <code>phone</code> → <code>phone</code> (the <code>p:</code> prefix is stripped)</li>
                <li><code>email</code> → appended into <code>notes</code></li>
                <li><code>what_part_do_you_need?</code> → <code>part_needed</code></li>
                <li><code>what_is_your_vehicle_year?/make?/model?</code> → <code>vehicle_year/make/model</code></li>
                <li><code>lead_status</code> from Meta is ignored — every imported lead starts as <code>new</code></li>
                <li><code>Agent Name</code> column (optional) — or the first unnamed column after <code>lead_status</code> — is used to assign leads. The value is matched against active agents by full name, then by first name (case-insensitive; "(Rahul)" and "vm" markers are ignored). Anything that doesn't match an active agent → unassigned and listed for review.</li>
                <li>Unnamed column after the agent column → <code>notes</code> (free-text agent notes)</li>
                <li>Rows with <code>email=test@meta.com</code> or test placeholders are skipped</li>
                <li>Rows whose <code>id</code> already exists in any lead's notes are skipped (dedupe)</li>
              </ul>
              <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
                <Download size={14} style={{ marginRight: 4 }} /> Download template
              </Button>
            </div>
          )}
        </>
      )}

      {step === STEP_PREVIEW && parseResult && (
        <>
          <div className={styles.fileBadge}>
            <strong>{fileName}</strong>
          </div>
          <div className={styles.summaryGrid}>
            <SummaryStat label="Valid rows" value={validCount} />
            <SummaryStat label="To import" value={newCount} highlight />
            <SummaryStat label="Duplicates (skip)" value={dupCount} />
            <SummaryStat label="Skipped rows" value={parseResult.skipped.length} />
          </div>

          {assignmentSummary && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Assignments</div>
              <div className={styles.assignList}>
                {Object.entries(assignmentSummary).map(([id, count]) => (
                  <span key={id} className={styles.assignChip}>
                    {id === 'UNASSIGNED' ? 'Unassigned' : nameForId(id, profileMap)}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {parseResult.unmappedAgents.length > 0 && (
            <div className={styles.warnBox}>
              <AlertCircle size={14} /> Unmapped agent values (will be unassigned):{' '}
              {parseResult.unmappedAgents.map((a) => <code key={a}>{a}</code>).reduce((acc, el, i) => {
                if (i === 0) return [el]
                return [...acc, ', ', el]
              }, [])}
            </div>
          )}

          {parseResult.skipped.length > 0 && (
            <details className={styles.details}>
              <summary>Skipped rows ({parseResult.skipped.length})</summary>
              <ul>
                {parseResult.skipped.map((s) => <li key={s.row}>Row {s.row}: {s.reason}</li>)}
              </ul>
            </details>
          )}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Preview (first 5)</div>
            <div className={styles.previewWrap}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Vehicle</th>
                    <th>Part</th>
                    <th>Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.leads.slice(0, 5).map((l, i) => (
                    <tr key={i}>
                      <td>{l.lead.customer_name || '—'}</td>
                      <td>{l.lead.phone || '—'}</td>
                      <td>{[l.lead.vehicle_year, l.lead.vehicle_make, l.lead.vehicle_model].filter(Boolean).join(' ') || '—'}</td>
                      <td className={styles.truncate}>{l.lead.part_needed || '—'}</td>
                      <td>{nameForId(l.lead.assigned_to, profileMap) || 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {step === STEP_IMPORTING && (
        <div className={styles.progressBox}>
          <p>Importing {progress.done} / {progress.total}…</p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {step === STEP_DONE && importResult && (
        <div className={styles.doneBox}>
          <CheckCircle2 size={28} className={styles.successIcon} />
          <p className={styles.doneTitle}>
            Imported {importResult.imported} of {importResult.attempted} leads
          </p>
          {importResult.duplicates > 0 && (
            <p className={styles.doneMeta}>{importResult.duplicates} duplicate(s) skipped</p>
          )}
          {importResult.errors.length > 0 && (
            <details className={styles.details}>
              <summary>{importResult.errors.length} error batch(es)</summary>
              <ul>
                {importResult.errors.map((e, i) => (
                  <li key={i}>Batch starting at row {e.batchStart}: {e.message}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Modal>
  )
}

function SummaryStat({ label, value, highlight }) {
  return (
    <div className={`${styles.statBox} ${highlight ? styles.statBoxHighlight : ''}`}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  )
}

function nameForId(id, profileMap) {
  if (!id) return null
  return profileMap[id] || id.slice(0, 6) + '…'
}

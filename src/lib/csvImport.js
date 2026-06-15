import { supabase } from './supabase'

// Browser-native CSV parser (RFC 4180 compliant; avoids Node.js Buffer dependency)
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const n = text.length

  for (let i = 0; i < n; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') { inQuotes = false }
      else { field += c }
    } else {
      if (c === '"') { inQuotes = true }
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++
        row.push(field); field = ''
        if (row.length > 1 || row[0] !== '') rows.push(row)
        row = []
      } else { field += c }
    }
  }
  row.push(field)
  if (row.length > 1 || row[0] !== '') rows.push(row)
  return rows
}

export const REQUIRED_COLUMNS = [
  'id',
  'created_time',
  'is_organic',
  'platform',
  'what_part_do_you_need?',
  'what_is_your_vehicle_year?',
  'what_is_your_vehicle_make?',
  'what_is_your_vehicle_model?',
  'email',
  'full_name',
  'phone_number (or phone)',
  'lead_status',
]

export const TEMPLATE_HEADERS = [
  'id', 'created_time', 'ad_id', 'ad_name', 'adset_id', 'adset_name',
  'campaign_id', 'campaign_name', 'form_id', 'form_name',
  'is_organic', 'platform',
  'what_part_do_you_need?', 'what_is_your_vehicle_year?',
  'what_is_your_vehicle_make?', 'what_is_your_vehicle_model?',
  'email', 'full_name', 'phone_number', 'lead_status', 'Agent Name', '',
]

// Optional explicit overrides for CSV agent values that don't cleanly match a
// profile name (left side must be normalizeName()'d form). Most names resolve
// automatically via full-name / first-name matching against live profiles, so
// this only needs entries for genuine quirks.
const AGENT_ALIASES = {
  // 'historical csv value' : 'current profile full name'
}

// Normalize an agent name for matching: lowercase, drop parentheticals like
// "(Rahul)", drop the "vm" voicemail marker, and collapse punctuation/space.
function normalizeName(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bvm\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Build a resolver from the live profiles list. Matches by exact normalized
// full name first, then by unique first name. Returns a profile id or null.
function buildAgentResolver(profiles) {
  const byFull = {}
  const byFirst = {}
  const firstSeen = {}
  for (const p of profiles) {
    const norm = normalizeName(p.full_name)
    if (!norm) continue
    byFull[norm] = p.id
    const first = norm.split(' ')[0]
    firstSeen[first] = (firstSeen[first] || 0) + 1
    byFirst[first] = p.id
  }
  // Drop ambiguous first names (shared by 2+ profiles) so we never misassign.
  for (const first of Object.keys(firstSeen)) {
    if (firstSeen[first] > 1) delete byFirst[first]
  }
  return (agentRaw) => {
    let norm = normalizeName(agentRaw)
    if (!norm) return null
    if (AGENT_ALIASES[norm]) norm = normalizeName(AGENT_ALIASES[norm])
    if (byFull[norm]) return byFull[norm]
    const first = norm.split(' ')[0]
    if (byFirst[first]) return byFirst[first]
    return null
  }
}

function clean(s) {
  if (s == null) return null
  const t = String(s).trim()
  return t || null
}

function isTestValue(s) {
  return typeof s === 'string' && /^<test lead:/i.test(s.trim())
}

function normalizePhone(raw) {
  if (!raw) return null
  const stripped = String(raw).replace(/^p:/i, '').trim()
  const digits = stripped.replace(/\D/g, '')
  if (digits.length < 7) return null
  return digits
}

function parseYear(raw) {
  if (!raw) return null
  const n = parseInt(String(raw).trim(), 10)
  if (n >= 1900 && n <= 2030) return n
  return null
}

function buildNotes({ col21, col22, metaId, email }) {
  const parts = []
  const noteText = [clean(col21), clean(col22)].filter(Boolean).join(' | ')
  if (noteText) parts.push(noteText)
  const meta = []
  if (metaId) meta.push(`meta_lead_id=${metaId}`)
  if (email) meta.push(`email=${email}`)
  if (meta.length) parts.push(meta.join(' '))
  return parts.length ? parts.join('\n---\n') : null
}

export function parseLeadsCsv(csvText, profiles, currentUserId) {
  const rows = parseCsv(csvText)
  if (rows.length < 2) {
    return { leads: [], skipped: [], unmappedAgents: [], error: 'CSV is empty or has no data rows' }
  }
  const header = rows[0].map((h) => (h || '').trim().toLowerCase())
  const idx = (name) => header.indexOf(name.toLowerCase())

  // Flexible required-column validation: phone accepts 'phone_number' or 'phone'
  const CORE_REQUIRED = [
    'id', 'created_time', 'is_organic', 'platform',
    'what_part_do_you_need?', 'what_is_your_vehicle_year?',
    'what_is_your_vehicle_make?', 'what_is_your_vehicle_model?',
    'email', 'full_name', 'lead_status',
  ]
  const missing = CORE_REQUIRED.filter((c) => !header.includes(c.toLowerCase()))
  if (!header.includes('phone_number') && !header.includes('phone')) {
    missing.push('phone_number (or phone)')
  }
  if (missing.length) {
    return { leads: [], skipped: [], unmappedAgents: [], error: `Missing required columns: ${missing.join(', ')}` }
  }

  const ID = idx('id')
  const CREATED_TIME = idx('created_time')
  const IS_ORGANIC = idx('is_organic')
  const PLATFORM = idx('platform')
  const PART = idx('what_part_do_you_need?')
  const YEAR = idx('what_is_your_vehicle_year?')
  const MAKE = idx('what_is_your_vehicle_make?')
  const MODEL = idx('what_is_your_vehicle_model?')
  const EMAIL = idx('email')
  const FULL_NAME = idx('full_name')
  // Accept 'phone_number' (older Meta export) or 'phone' (newer export)
  const PHONE = idx('phone_number') >= 0 ? idx('phone_number') : idx('phone')
  const LEAD_STATUS_COL = idx('lead_status')
  // Agent Name: explicit column, or first unnamed column right after lead_status
  const AGENT = (() => {
    const i = idx('agent name')
    if (i >= 0) return i
    const next = LEAD_STATUS_COL + 1
    if (next < header.length && !header[next]) return next
    return -1
  })()
  // Unnamed columns after Agent Name (or after lead_status when no Agent col)
  const NOTES_A = AGENT >= 0 ? AGENT + 1 : LEAD_STATUS_COL + 1
  const NOTES_B = NOTES_A + 1

  const resolveAgent = buildAgentResolver(profiles)
  let firstManager = null
  for (const p of profiles) {
    if (p.role === 'manager' && !firstManager) firstManager = p.id
  }
  const createdById = currentUserId || firstManager

  const dataRows = rows.slice(1)
  const leads = []
  const skipped = []
  const unmappedAgents = new Set()

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i]
    const rowNum = i + 2

    const metaId = clean(r[ID])
    const createdTime = clean(r[CREATED_TIME])
    const isOrganic = (clean(r[IS_ORGANIC]) || '').toLowerCase() === 'true'
    const platform = clean(r[PLATFORM])
    const partRaw = r[PART]
    const yearRaw = r[YEAR]
    const makeRaw = r[MAKE]
    const modelRaw = r[MODEL]
    const email = clean(r[EMAIL])
    const fullName = clean(r[FULL_NAME])
    const phoneRaw = r[PHONE]
    const agentRaw = clean(r[AGENT]) || ''
    const col21 = NOTES_A < r.length ? r[NOTES_A] : null
    const col22 = NOTES_B < r.length ? r[NOTES_B] : null

    if ((email && /^test@meta\.com$/i.test(email)) || isTestValue(fullName) || isTestValue(partRaw)) {
      skipped.push({ row: rowNum, reason: 'test row' })
      continue
    }

    const phone = normalizePhone(phoneRaw)
    if (!phone && !fullName) {
      skipped.push({ row: rowNum, reason: 'no phone and no name' })
      continue
    }

    let assignedTo = null
    if (agentRaw) {
      const matchedId = resolveAgent(agentRaw)
      if (matchedId) {
        assignedTo = matchedId
      } else {
        unmappedAgents.add(agentRaw)
      }
    }

    const tags = []
    if (isOrganic) tags.push('organic')
    if (platform) tags.push(platform.toLowerCase())

    let dateOnly = null
    let createdAtIso = null
    if (createdTime) {
      const d = new Date(createdTime)
      if (!isNaN(d.getTime())) {
        createdAtIso = d.toISOString()
        dateOnly = createdAtIso.split('T')[0]
      }
    }
    if (!dateOnly) dateOnly = new Date().toISOString().split('T')[0]

    leads.push({
      _rowNum: rowNum,
      _metaId: metaId,
      lead: {
        date: dateOnly,
        customer_name: fullName,
        phone,
        vehicle_year: parseYear(yearRaw),
        vehicle_make: clean(makeRaw),
        vehicle_model: clean(modelRaw),
        part_needed: clean(partRaw),
        status: 'new',
        notes: buildNotes({ col21, col22, metaId, email }),
        tags: tags.length ? tags : null,
        assigned_to: assignedTo,
        created_by: createdById,
        ...(createdAtIso ? { created_at: createdAtIso, updated_at: createdAtIso } : {}),
      },
    })
  }

  return { leads, skipped, unmappedAgents: [...unmappedAgents], error: null }
}

export async function findExistingMetaIds(metaIds) {
  const ids = [...new Set(metaIds.filter(Boolean))]
  if (!ids.length) return new Set()
  const found = new Set()
  const CHUNK = 50
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const orFilters = chunk.map((id) => `notes.ilike.*meta_lead_id=${id.replace(/[%,()]/g, '')}*`).join(',')
    const { data, error } = await supabase.from('leads').select('notes').or(orFilters)
    if (error) {
      console.error('Dedupe query failed:', error)
      continue
    }
    for (const row of data || []) {
      const m = (row.notes || '').match(/meta_lead_id=([^\s]+)/)
      if (m) found.add(m[1])
    }
  }
  return found
}

export async function importLeads(leadsToInsert, onProgress) {
  const BATCH = 50
  let imported = 0
  const errors = []
  for (let i = 0; i < leadsToInsert.length; i += BATCH) {
    const batch = leadsToInsert.slice(i, i + BATCH).map((x) => x.lead)
    const { error } = await supabase.from('leads').insert(batch)
    if (error) {
      errors.push({ batchStart: i, message: error.message })
    } else {
      imported += batch.length
    }
    if (onProgress) onProgress({ done: Math.min(i + BATCH, leadsToInsert.length), total: leadsToInsert.length })
  }
  return { imported, errors }
}

export function buildTemplateCsv() {
  const sample = [
    'l:1234567890', '2026-01-15T10:00:00-05:00',
    '', '', '', '', '', '', '', '',
    'false', 'fb',
    'Transmission', '2018', 'Toyota', 'Camry',
    'jane@example.com', 'Jane Doe', 'p:+15551234567',
    'CREATED', 'Neal', 'VM dropped',
  ]
  const lines = [TEMPLATE_HEADERS.join(','), sample.join(',')]
  return lines.join('\n')
}

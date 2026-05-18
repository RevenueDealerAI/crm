import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : null
const CSV_PATH = '/Users/kushagragangwar/work_space/crm/AutoParts Leads Dashboard - auto parts (2).csv'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Required env vars: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const AGENT_NAME_MAP = {
  'michael': 'Michael',
  'michael vm': 'Michael',
  'alex(rahul)': 'alix',
  'neal': 'Neal',
  'martin': 'Martin',
}

function normalizePhone(raw) {
  if (!raw) return null
  const stripped = raw.replace(/^p:/i, '').trim()
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

function isTestValue(s) {
  return typeof s === 'string' && /^<test lead:/i.test(s.trim())
}

function clean(s) {
  if (s == null) return null
  const t = String(s).trim()
  return t || null
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

async function loadProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('is_active', true)
  if (error) throw new Error(`Failed to load profiles: ${error.message}`)
  const byName = {}
  let firstManager = null
  for (const p of data || []) {
    byName[p.full_name] = p.id
    if (p.role === 'manager' && !firstManager) firstManager = p.id
  }
  return { byName, firstManager, all: data }
}

async function run() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORTING ===')

  const csv = readFileSync(CSV_PATH, 'utf-8')
  const rows = parse(csv, { columns: false, skip_empty_lines: true, relax_column_count: true })
  const dataRows = rows.slice(1)

  const { byName, firstManager, all } = await loadProfiles()
  console.log('Profiles loaded:', all.map(p => `${p.full_name}(${p.role})`).join(', '))

  if (!firstManager) throw new Error('No manager found in profiles')
  const createdById = firstManager
  const managerName = all.find(p => p.id === firstManager)?.full_name
  console.log(`created_by default: ${createdById} (${managerName}/manager)`)

  const leads = []
  const skipped = []
  const unmappedAgents = new Set()

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i]
    const rowNum = i + 2

    const metaId = clean(r[0])
    const createdTime = clean(r[1])
    const isOrganic = (clean(r[10]) || '').toLowerCase() === 'true'
    const platform = clean(r[11])
    const partRaw = r[12]
    const yearRaw = r[13]
    const makeRaw = r[14]
    const modelRaw = r[15]
    const email = clean(r[16])
    const fullName = clean(r[17])
    const phoneRaw = r[18]
    // r[19] = lead_status from Meta = always CREATED → status='new'
    const agentRaw = clean(r[20]) || ''
    const col21 = r[21]
    const col22 = r[22]

    // Skip Meta test rows
    if ((email && /^test@meta\.com$/i.test(email)) || isTestValue(fullName) || isTestValue(partRaw)) {
      skipped.push({ row: rowNum, reason: 'test row', email })
      continue
    }

    const phone = normalizePhone(phoneRaw)
    if (!phone && !fullName) {
      skipped.push({ row: rowNum, reason: 'no phone and no name' })
      continue
    }

    // Agent mapping
    let assignedTo = null
    if (agentRaw) {
      const key = agentRaw.toLowerCase().trim()
      const mappedName = AGENT_NAME_MAP[key]
      if (mappedName && byName[mappedName]) {
        assignedTo = byName[mappedName]
      } else if (!mappedName) {
        // Wrong Number / Cx want to buy car / unknown → null, but record
        unmappedAgents.add(agentRaw)
      }
    }

    // Tags from is_organic / platform
    const tags = []
    if (isOrganic) tags.push('organic')
    if (platform) tags.push(platform.toLowerCase())

    // Date / created_at from created_time (e.g. 2026-04-13T09:21:11-05:00)
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

  console.log(`\nParsed ${leads.length} leads, skipped ${skipped.length}`)
  if (skipped.length) {
    console.log('Skipped:')
    for (const s of skipped) console.log(`  row ${s.row}: ${s.reason}${s.email ? ' ('+s.email+')' : ''}`)
  }
  if (unmappedAgents.size) {
    console.log('Unmapped agent values (assigned_to=null):', [...unmappedAgents])
  }

  // assignment summary
  const assignCount = {}
  for (const { lead } of leads) {
    const k = lead.assigned_to || 'UNASSIGNED'
    assignCount[k] = (assignCount[k] || 0) + 1
  }
  const idToName = Object.fromEntries(Object.entries(byName).map(([n, id]) => [id, n]))
  console.log('\nAssignment counts:')
  for (const [id, count] of Object.entries(assignCount)) {
    console.log(`  ${idToName[id] || id}: ${count}`)
  }

  if (DRY_RUN) {
    console.log('\n--- Sample leads (first 3) ---')
    for (const { lead, _rowNum, _metaId } of leads.slice(0, 3)) {
      console.log(`row ${_rowNum} meta=${_metaId}`)
      console.log(JSON.stringify(lead, null, 2))
    }
    console.log(`\nDry run complete. Would import ${leads.length} leads.`)
    return
  }

  const toImport = LIMIT ? leads.slice(0, LIMIT) : leads
  if (LIMIT) console.log(`\n** LIMIT=${LIMIT}: importing first ${toImport.length} of ${leads.length} **`)
  let imported = 0, duplicates = 0, errors = 0
  for (const { lead, _metaId } of toImport) {
    // Idempotency: dedupe on meta_lead_id stored in notes
    if (_metaId) {
      const { data: existing, error: qerr } = await supabase
        .from('leads')
        .select('id')
        .ilike('notes', `%meta_lead_id=${_metaId}%`)
        .limit(1)
      if (qerr) {
        console.error(`Query error for meta=${_metaId}: ${qerr.message}`)
      } else if (existing && existing.length > 0) {
        duplicates++
        continue
      }
    }
    const { error } = await supabase.from('leads').insert(lead)
    if (error) {
      console.error(`Insert failed (meta=${_metaId} phone=${lead.phone}): ${error.message}`)
      errors++
    } else {
      imported++
    }
  }

  console.log(`\n=== DONE ===`)
  console.log(`Imported: ${imported}, Duplicates skipped: ${duplicates}, Errors: ${errors}`)
}

run().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})

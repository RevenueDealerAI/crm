import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

const DRY_RUN = process.argv.includes('--dry-run')
const CSV_PATH = decodeURIComponent(new URL('../DiscountAutoParts - Sheet1.csv', import.meta.url).pathname)

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Required env vars: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const MONTH_MAP = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
}

function parseDate(raw) {
  if (!raw || !raw.trim()) return null
  const cleaned = raw.trim().toLowerCase()
  const match = cleaned.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{2,4})$/)
  if (!match) return null
  const day = parseInt(match[1], 10)
  const monthNum = MONTH_MAP[match[2]]
  if (monthNum === undefined) return null
  let year = parseInt(match[3], 10)
  if (year < 100) year += 2000
  const d = new Date(year, monthNum, day)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0]
}

function normalizePhone(raw) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 7) return null
  return digits
}

function inferTags(col4, col8, col9) {
  const tags = []
  const combined = [col4, col8, col9].filter(Boolean).join(' ').toLowerCase()
  if (/incompatible/.test(combined)) tags.push('incompatible')
  if (/spanish|purtagi/.test(combined)) tags.push('spanish')
  if (/small\s*part/.test(combined)) tags.push('small_part')
  if (/abused/.test(combined)) tags.push('abused')
  if (/no\s*voice/.test(combined)) tags.push('no_voice')
  return tags.length > 0 ? tags : null
}

function inferStatus(col9, col10) {
  const combined = [col9, col10].filter(Boolean).join(' ').toLowerCase()
  if (/\bsold\b|payment\s*done|payment\s*link\s*shared/.test(combined)) return 'won'
  if (/bought?\s*local|buy\s*from\s*local|from\s*local\s*shope|want\s*local|want\s*ofline|want\s*to\s*buy\s*ofline|buy\s*from\s*store|self\s*buy/.test(combined)) return 'lost'
  if (/hung\s*up|abused|scam|fake\s*guy|bhag\s*gaya|run\s*away|time\s*pass/.test(combined)) return 'dead'
  if (/quot|qut|quta/.test(combined)) return 'quoted'
  if (/call\s*back|cb\b|will\s*call|waiting\s*for|will\s*discuss|will\s*talk|check\s*th[ae]n|discus/.test(combined)) return 'contacted'
  return 'new'
}

async function loadRepMap() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_active', true)

  if (error) throw new Error(`Failed to load profiles: ${error.message}`)

  const map = {}
  for (const p of data || []) {
    map[p.full_name.toLowerCase()] = p.id
  }
  return map
}

async function run() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORTING ===')

  const csv = readFileSync(CSV_PATH, 'utf-8')
  const rows = parse(csv, { columns: false, skip_empty_lines: true, relax_column_count: true })

  const dataRows = rows.slice(1)

  let repMap = {}
  if (!DRY_RUN) {
    repMap = await loadRepMap()
    console.log(`Found reps: ${Object.keys(repMap).join(', ')}`)
  }

  const leads = []
  const skipped = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const [col1, col2, col3, col4, col5, col6, col7, col8, col9, col10, col11, col12] = row

    const phone = normalizePhone(col3)
    const customerName = (col2 || '').trim()
    const isNameEmpty = !customerName || /^(na|miss\s*call|incompatible)$/i.test(customerName)

    if (!phone && isNameEmpty) {
      skipped.push({ row: i + 2, reason: 'no phone and no customer name' })
      continue
    }

    const date = parseDate(col1)
    const phoneSecondary = normalizePhone(col4)

    let vehicleYear = null
    const yearRaw = (col5 || '').trim().replace(/\s*bis$/i, '')
    const yearNum = parseInt(yearRaw, 10)
    if (yearNum >= 1900 && yearNum <= 2030) vehicleYear = yearNum

    const vehicleMake = (col6 || '').trim() || null
    const vehicleModel = (col7 || '').trim() || null
    const partNeeded = (col8 || '').trim() || null
    const notes = (col9 || '').trim() || null
    const followUpNotes = (col10 || '').trim() || null
    const tags = inferTags(col4, col8, col9)
    const status = inferStatus(col9, col10)

    const repName = (col11 || '').trim().toLowerCase()
    const assignedTo = repMap[repName] || null

    leads.push({
      date: date || new Date().toISOString().split('T')[0],
      customer_name: isNameEmpty ? null : customerName,
      phone,
      phone_secondary: phoneSecondary !== phone ? phoneSecondary : null,
      vehicle_year: vehicleYear,
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      part_needed: partNeeded,
      notes,
      follow_up_notes: followUpNotes,
      tags,
      status,
      assigned_to: assignedTo,
    })
  }

  console.log(`\nParsed: ${leads.length} leads, Skipped: ${skipped.length} rows`)

  if (skipped.length > 0) {
    console.log('\nSkipped rows:')
    for (const s of skipped) {
      console.log(`  Row ${s.row}: ${s.reason}`)
    }
  }

  if (DRY_RUN) {
    console.log('\nSample leads (first 5):')
    for (const lead of leads.slice(0, 5)) {
      console.log(JSON.stringify(lead, null, 2))
    }
    console.log(`\nDry run complete. ${leads.length} leads would be imported.`)
    return
  }

  let imported = 0
  let duplicates = 0
  let errors = 0

  for (const lead of leads) {
    // Idempotency: check by phone + date
    if (lead.phone) {
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', lead.phone)
        .eq('date', lead.date)
        .limit(1)

      if (existing && existing.length > 0) {
        duplicates++
        continue
      }
    }

    const { error } = await supabase
      .from('leads')
      .insert(lead)

    if (error) {
      console.error(`Error importing lead (phone: ${lead.phone}): ${error.message}`)
      errors++
    } else {
      imported++
    }
  }

  console.log(`\n=== IMPORT COMPLETE ===`)
  console.log(`Imported: ${imported}`)
  console.log(`Duplicates skipped: ${duplicates}`)
  console.log(`Errors: ${errors}`)
}

run().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})

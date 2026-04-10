import { supabase } from './supabase'

export async function getLeads({
  status,
  statuses,
  assignedTo,
  search,
  dateFrom,
  dateTo,
  tags,
  sortBy = 'created_at',
  sortDir = 'desc',
  page = 1,
  pageSize = 25,
} = {}) {
  let query = supabase
    .from('leads')
    .select('*, profiles!assigned_to(full_name)', { count: 'exact' })
    .order(sortBy, { ascending: sortDir === 'asc' })

  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses)
  } else if (status) {
    query = query.eq('status', status)
  }

  if (assignedTo) query = query.eq('assigned_to', assignedTo)

  if (search) {
    const s = search.trim()
    query = query.or(
      `customer_name.ilike.%${s}%,phone.ilike.%${s}%,vehicle_make.ilike.%${s}%,vehicle_model.ilike.%${s}%,notes.ilike.%${s}%`
    )
  }

  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)

  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags)
  }

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data, count, page, pageSize }
}

export async function getLeadById(id) {
  const { data, error } = await supabase
    .from('leads')
    .select('*, profiles!assigned_to(full_name), activity_log(id, action, old_value, new_value, created_at, user_id, profiles(full_name))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createLead(leadData) {
  const { data, error } = await supabase
    .from('leads')
    .insert(leadData)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateLead(id, updates) {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteLead(id) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
  if (error) throw error
}

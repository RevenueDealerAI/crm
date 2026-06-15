import { supabase } from './supabase'

async function callManageAgents(payload) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-agents`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(payload),
    }
  )
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || 'Request failed')
  }
  return result
}

// All profiles (active + inactive) for the management screen.
export async function listAllAgents() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .order('is_active', { ascending: false })
    .order('full_name', { ascending: true })
  if (error) throw error
  return data
}

export function createAgent({ email, fullName, password, role = 'rep' }) {
  return callManageAgents({ action: 'create', email, full_name: fullName, password, role })
}

export function setAgentActive(id, active) {
  return callManageAgents({ action: active ? 'reactivate' : 'deactivate', id })
}

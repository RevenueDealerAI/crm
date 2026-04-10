import { supabase } from './supabase'

export async function assignLead(leadId) {
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-lead`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ lead_id: leadId }),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Assignment failed')
  }

  return result
}

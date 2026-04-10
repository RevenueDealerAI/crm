import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { lead_id } = await req.json()

    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all active reps, ordered alphabetically by name for deterministic rotation
    const { data: reps, error: repsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'rep')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (repsError) throw repsError

    if (!reps || reps.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active reps available for assignment' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the most recently assigned lead to determine who's next in rotation
    const { data: lastAssigned, error: lastError } = await supabase
      .from('leads')
      .select('assigned_to')
      .not('assigned_to', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastError) throw lastError

    let nextRep

    if (!lastAssigned || !lastAssigned.assigned_to) {
      // No previous assignment — assign to first rep alphabetically
      nextRep = reps[0]
    } else {
      // Find the index of the last-assigned rep in the alphabetical list
      const lastIndex = reps.findIndex((r) => r.id === lastAssigned.assigned_to)

      if (lastIndex === -1) {
        // Last assigned rep is no longer active — start from first
        nextRep = reps[0]
      } else {
        // Cycle to next rep
        nextRep = reps[(lastIndex + 1) % reps.length]
      }
    }

    // Assign the lead
    const { error: updateError } = await supabase
      .from('leads')
      .update({ assigned_to: nextRep.id })
      .eq('id', lead_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ assigned_to: nextRep.id, assigned_name: nextRep.full_name }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

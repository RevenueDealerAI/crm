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

    const today = new Date().toISOString().split('T')[0]

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, customer_name, vehicle_make, vehicle_model, follow_up_date, assigned_to')
      .lte('follow_up_date', today)
      .not('assigned_to', 'is', null)
      .not('status', 'in', '("won","lost","dead")')

    if (leadsError) throw leadsError

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No follow-ups due', created: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const leadIds = leads.map((l) => l.id)
    const { data: existing, error: existingError } = await supabase
      .from('notifications')
      .select('lead_id')
      .eq('type', 'follow_up_reminder')
      .in('lead_id', leadIds)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)

    if (existingError) throw existingError

    const alreadyNotified = new Set((existing || []).map((n) => n.lead_id))

    const notifications = leads
      .filter((lead) => !alreadyNotified.has(lead.id))
      .map((lead) => {
        const vehicle = [lead.vehicle_make, lead.vehicle_model].filter(Boolean).join(' ') || 'Unknown vehicle'
        const name = lead.customer_name || 'Unknown customer'
        return {
          user_id: lead.assigned_to,
          type: 'follow_up_reminder',
          title: 'Follow-up Due',
          message: `${name} — ${vehicle} follow-up was due ${lead.follow_up_date}`,
          lead_id: lead.id,
        }
      })

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All reminders already sent today', created: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({ message: `Created ${notifications.length} reminder(s)`, created: notifications.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

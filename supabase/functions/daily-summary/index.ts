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
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + mondayOffset)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('is_active', true)

    if (usersError) throw usersError
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active users', created: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userIds = users.map((u) => u.id)
    const { data: existingSummaries, error: existError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('type', 'daily_summary')
      .in('user_id', userIds)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)

    if (existError) throw existError

    const alreadySummarized = new Set((existingSummaries || []).map((n) => n.user_id))

    const { data: allLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, assigned_to, status, follow_up_date, created_at')

    if (leadsError) throw leadsError

    const activeStatuses = ['new', 'contacted', 'quoted', 'negotiating']
    const leads = allLeads || []

    const notifications = []

    for (const user of users) {
      if (alreadySummarized.has(user.id)) continue

      const isManager = user.role === 'manager'

      const userLeads = leads.filter((l) => l.assigned_to === user.id)
      const activeCount = userLeads.filter((l) => activeStatuses.includes(l.status)).length
      const followUpsDue = userLeads.filter(
        (l) => l.follow_up_date && l.follow_up_date <= today && activeStatuses.includes(l.status)
      ).length
      const newYesterday = userLeads.filter(
        (l) => l.created_at && l.created_at.startsWith(yesterday)
      ).length
      const wonThisWeek = userLeads.filter(
        (l) => l.status === 'won' && l.created_at && l.created_at.split('T')[0] >= weekStartStr
      ).length

      let message = `You have ${activeCount} active lead${activeCount !== 1 ? 's' : ''}, ${followUpsDue} follow-up${followUpsDue !== 1 ? 's' : ''} due today, ${newYesterday} new lead${newYesterday !== 1 ? 's' : ''} yesterday. ${wonThisWeek} lead${wonThisWeek !== 1 ? 's' : ''} won this week.`

      if (isManager) {
        const totalActive = leads.filter((l) => activeStatuses.includes(l.status)).length
        const unassigned = leads.filter(
          (l) => !l.assigned_to && activeStatuses.includes(l.status)
        ).length
        message += ` Team: ${totalActive} total active leads, ${unassigned} unassigned.`
      }

      notifications.push({
        user_id: user.id,
        type: 'daily_summary',
        title: 'Daily Summary',
        message,
      })
    }

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All summaries already sent today', created: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({ message: `Created ${notifications.length} summary(ies)`, created: notifications.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

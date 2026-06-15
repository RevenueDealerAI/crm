import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) return json({ error: 'Missing authorization' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify the caller is an active manager before doing anything privileged.
    const { data: { user }, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !user) return json({ error: 'Invalid session' }, 401)

    const { data: prof } = await admin
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!prof || prof.role !== 'manager' || !prof.is_active) {
      return json({ error: 'Manager access required' }, 403)
    }

    const body = await req.json()
    const action = body.action

    if (action === 'create') {
      const email = (body.email || '').trim().toLowerCase()
      const full_name = (body.full_name || '').trim()
      const password = body.password || ''
      const role = body.role === 'manager' ? 'manager' : 'rep'
      if (!email || !full_name || !password) {
        return json({ error: 'email, full_name and password are required' }, 400)
      }
      if (password.length < 8) {
        return json({ error: 'Password must be at least 8 characters' }, 400)
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role },
      })
      if (error) return json({ error: error.message }, 400)
      // The on_auth_user_created trigger creates the profile row from the
      // metadata above; nothing else to do here.
      return json({ ok: true, id: data.user?.id, full_name, role })
    }

    if (action === 'deactivate' || action === 'reactivate') {
      const id = body.id
      if (!id) return json({ error: 'id is required' }, 400)
      if (id === user.id) return json({ error: 'You cannot change your own status' }, 400)
      const is_active = action === 'reactivate'
      const { error } = await admin.from('profiles').update({ is_active }).eq('id', id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, id, is_active })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

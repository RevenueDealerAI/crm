import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function startOfWeek() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.getFullYear(), now.getMonth(), diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

function startOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

export default function useDashboardData() {
  const [stats, setStats] = useState({ active: 0, followUpsDue: 0, quotedWeek: 0, wonMonth: 0 })
  const [followUps, setFollowUps] = useState([])
  const [recentLeads, setRecentLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const today = todayDate()
      const weekStart = startOfWeek()
      const monthStart = startOfMonth()

      const [activeRes, followUpCountRes, quotedRes, wonRes, followUpLeadsRes, recentRes] =
        await Promise.all([
          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .not('status', 'in', '(won,lost,dead)'),

          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .lte('follow_up_date', today)
            .not('status', 'in', '(won,lost,dead)'),

          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'quoted')
            .gte('updated_at', weekStart),

          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'won')
            .gte('updated_at', monthStart),

          supabase
            .from('leads')
            .select('*, profiles!assigned_to(full_name)')
            .lte('follow_up_date', today)
            .not('status', 'in', '(won,lost,dead)')
            .order('follow_up_date', { ascending: true })
            .limit(20),

          supabase
            .from('leads')
            .select('*, profiles!assigned_to(full_name)')
            .order('created_at', { ascending: false })
            .limit(10),
        ])

      for (const res of [activeRes, followUpCountRes, quotedRes, wonRes, followUpLeadsRes, recentRes]) {
        if (res.error) throw res.error
      }

      setStats({
        active: activeRes.count || 0,
        followUpsDue: followUpCountRes.count || 0,
        quotedWeek: quotedRes.count || 0,
        wonMonth: wonRes.count || 0,
      })

      setFollowUps(followUpLeadsRes.data || [])
      setRecentLeads(recentRes.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { stats, followUps, recentLeads, loading, error, refetch: fetchData }
}

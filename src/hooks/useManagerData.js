import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function startOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

export default function useManagerData() {
  const [stats, setStats] = useState({ totalActive: 0, unassigned: 0, followUpsDue: 0, wonMonth: 0 })
  const [repStats, setRepStats] = useState([])
  const [activityFeed, setActivityFeed] = useState([])
  const [leads, setLeads] = useState([])
  const [unassignedLeads, setUnassignedLeads] = useState([])
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const today = todayDate()
      const monthStart = startOfMonth()

      const [
        activeRes,
        unassignedCountRes,
        followUpRes,
        wonRes,
        repsRes,
        allLeadsRes,
        unassignedRes,
        activityRes,
      ] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .not('status', 'in', '(won,lost,dead)'),

        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('assigned_to', null)
          .not('status', 'in', '(won,lost,dead)'),

        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .lte('follow_up_date', today)
          .not('status', 'in', '(won,lost,dead)'),

        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'won')
          .gte('updated_at', monthStart),

        supabase
          .from('profiles')
          .select('id, full_name, role, is_active')
          .eq('role', 'rep')
          .eq('is_active', true)
          .order('full_name'),

        supabase
          .from('leads')
          .select('*, profiles!assigned_to(full_name)')
          .not('status', 'in', '(won,lost,dead)')
          .order('created_at', { ascending: false })
          .limit(100),

        supabase
          .from('leads')
          .select('*, profiles!assigned_to(full_name)')
          .is('assigned_to', null)
          .not('status', 'in', '(won,lost,dead)')
          .order('created_at', { ascending: false }),

        supabase
          .from('activity_log')
          .select('*, profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      for (const res of [activeRes, unassignedCountRes, followUpRes, wonRes, repsRes, allLeadsRes, unassignedRes, activityRes]) {
        if (res.error) throw res.error
      }

      setStats({
        totalActive: activeRes.count || 0,
        unassigned: unassignedCountRes.count || 0,
        followUpsDue: followUpRes.count || 0,
        wonMonth: wonRes.count || 0,
      })

      const repList = repsRes.data || []
      setReps(repList)

      const allLeadsList = allLeadsRes.data || []
      const repCounts = repList.map((rep) => ({
        ...rep,
        activeCount: allLeadsList.filter((l) => l.assigned_to === rep.id).length,
      }))
      setRepStats(repCounts)

      setLeads(allLeadsList)
      setUnassignedLeads(unassignedRes.data || [])
      setActivityFeed(activityRes.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load manager data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { stats, repStats, activityFeed, leads, unassignedLeads, reps, loading, error, refetch: fetchData }
}

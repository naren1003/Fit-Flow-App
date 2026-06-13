import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Dumbbell, Flame, Calendar, TrendingUp } from 'lucide-react'

export default function MemberDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ sessions: 0, streak: 0, activePlan: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadStats()
  }, [user])

  async function loadStats() {
    // Sessions this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { count } = await supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', user.id)
      .gte('completed_at', startOfMonth)

    // Active plan
    const { data: plan } = await supabase
      .from('plan_assignments')
      .select('*, workout_plans(name, goal)')
      .eq('member_id', user.id)
      .eq('is_active', true)
      .single()

    setStats({ sessions: count ?? 0, activePlan: plan })
    setLoading(false)
  }

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Good morning, {firstName} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">{today}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Dumbbell,   color: 'text-brand-400 bg-brand-50', label: 'Sessions this month', value: loading ? '…' : stats.sessions },
          { icon: Flame,      color: 'text-orange-500 bg-orange-50', label: 'Day streak',          value: '—' },
          { icon: TrendingUp, color: 'text-blue-500 bg-blue-50',   label: 'PRs this month',       value: '—' },
          { icon: Calendar,   color: 'text-purple-500 bg-purple-50', label: 'Days trained/week',  value: '—' },
        ].map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="card">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon size={16} />
            </div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Active plan */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Active plan</h2>
          {loading ? (
            <div className="h-20 bg-gray-50 rounded-lg animate-pulse" />
          ) : stats.activePlan ? (
            <div>
              <p className="text-base font-medium text-gray-900">{stats.activePlan.workout_plans?.name}</p>
              <p className="text-sm text-gray-500 mt-1">Goal: {stats.activePlan.workout_plans?.goal}</p>
              {stats.activePlan.trainer_notes && (
                <div className="mt-3 p-3 bg-brand-50 rounded-lg">
                  <p className="text-xs font-medium text-brand-600 mb-1">Trainer notes</p>
                  <p className="text-sm text-gray-700">{stats.activePlan.trainer_notes}</p>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button className="btn btn-sm" onClick={() => navigate('/member/timetable')}>View timetable</button>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/member/workout')}>Start today's workout</button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Dumbbell size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No active plan yet.</p>
              <p className="text-xs text-gray-400">Your trainer will assign one soon.</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent workouts</h2>
          <RecentWorkouts userId={user?.id} />
        </div>
      </div>
    </div>
  )
}

function RecentWorkouts({ userId }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('workout_sessions')
      .select('*')
      .eq('member_id', userId)
      .order('completed_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { setSessions(data ?? []); setLoading(false) })
  }, [userId])

  if (loading) return <div className="h-24 bg-gray-50 rounded-lg animate-pulse" />

  if (!sessions.length) return (
    <div className="text-center py-6">
      <p className="text-sm text-gray-500">No workouts logged yet.</p>
      <p className="text-xs text-gray-400">Your first session will appear here.</p>
    </div>
  )

  return (
    <ul className="divide-y divide-gray-100">
      {sessions.map(s => (
        <li key={s.id} className="py-2.5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{s.day_name ?? 'Workout'}</p>
            <p className="text-xs text-gray-400">
              {new Date(s.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <span className="badge badge-green">Done</span>
        </li>
      ))}
    </ul>
  )
}

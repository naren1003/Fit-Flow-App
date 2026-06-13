import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp } from 'lucide-react'

export default function MemberProgress() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [setLogs, setSetLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function loadData() {
    const { data: sess } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('member_id', user.id)
      .order('completed_at')

    const sessionIds = (sess ?? []).map(s => s.id)
    let logs = []
    if (sessionIds.length) {
      const { data } = await supabase
        .from('set_logs')
        .select('*')
        .in('session_id', sessionIds)
      logs = data ?? []
    }

    setSessions(sess ?? [])
    setSetLogs(logs)
    setLoading(false)
  }

  // Sessions per week (last 8 weeks)
  const weeklyData = buildWeeklyData(sessions)

  // Strength progression per exercise
  const exercises = [...new Set(setLogs.map(l => l.exercise_name))]
  const strengthData = buildStrengthData(setLogs, sessions, exercises[0])

  const totalSessions = sessions.length
  const thisMonth = sessions.filter(s => {
    const d = new Date(s.completed_at)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  if (loading) return <div className="flex flex-col gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-40 animate-pulse" />)}</div>

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Progress</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total sessions', value: totalSessions },
          { label: 'This month', value: thisMonth },
          { label: 'Exercises tracked', value: exercises.length },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="card flex flex-col items-center py-16 gap-3">
          <TrendingUp size={36} className="text-gray-300" />
          <p className="text-gray-500">No workout data yet.</p>
          <p className="text-sm text-gray-400">Complete your first workout to see progress here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Weekly sessions chart */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Sessions per week</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="sessions" stroke="#1D9E75" strokeWidth={2} dot={{ fill: '#1D9E75', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Strength progression */}
          {exercises.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Strength — {exercises[0]}</h2>
              <p className="text-xs text-gray-400 mb-4">Max weight per session</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={strengthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} unit=" kg" />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="maxKg" stroke="#1D9E75" strokeWidth={2} dot={{ fill: '#1D9E75', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function buildWeeklyData(sessions) {
  const weeks = {}
  sessions.forEach(s => {
    const d = new Date(s.completed_at)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    weeks[key] = (weeks[key] ?? 0) + 1
  })
  return Object.entries(weeks).slice(-8).map(([week, sessions]) => ({ week, sessions }))
}

function buildStrengthData(logs, sessions, exerciseName) {
  if (!exerciseName) return []
  const sessionMap = Object.fromEntries(sessions.map(s => [s.id, s.completed_at]))
  const bySession = {}
  logs.filter(l => l.exercise_name === exerciseName && l.weight_kg).forEach(l => {
    const date = sessionMap[l.session_id]
    if (!date) return
    const key = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    bySession[key] = Math.max(bySession[key] ?? 0, l.weight_kg)
  })
  return Object.entries(bySession).map(([date, maxKg]) => ({ date, maxKg }))
}

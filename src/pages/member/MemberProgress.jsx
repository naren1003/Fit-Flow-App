import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp } from 'lucide-react'

export default function MemberProgress() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [setLogs, setSetLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState(null)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function loadData() {
    const { data: sess } = await supabase
      .from('workout_sessions')
      .select('id, completed_at, started_at, day_name')
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
    const exercises = [...new Set(logs.map(l => l.exercise_name))]
    if (exercises.length) setSelectedExercise(exercises[0])
    setLoading(false)
  }

  const exercises = [...new Set(setLogs.map(l => l.exercise_name))]
  const weeklyData = buildWeeklyData(sessions)
  const volumeData = buildVolumeData(setLogs, sessions)
  const timeData = buildTimeData(sessions)
  const strengthData = buildStrengthData(setLogs, sessions, selectedExercise)

  const totalSessions = sessions.length
  const thisMonth = sessions.filter(s => {
    const d = new Date(s.completed_at), n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length
  const totalVolume = setLogs.reduce((sum, l) => sum + ((l.reps ?? 0) * (l.weight_kg ?? 0)), 0)

  if (loading) return <div className="flex flex-col gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-40 animate-pulse" />)}</div>

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Progress</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total sessions', value: totalSessions },
          { label: 'This month', value: thisMonth },
          { label: 'Exercises tracked', value: exercises.length },
          { label: 'Total volume', value: totalVolume > 1000 ? `${(totalVolume/1000).toFixed(1)}t` : `${totalVolume}kg` },
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
        <div className="grid md:grid-cols-2 gap-4">

          {/* Sessions per week */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Sessions per week</h2>
            <p className="text-xs text-gray-400 mb-4">Last 8 weeks</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="sessions" fill="#1D9E75" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Volume per session */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Volume lifted per session</h2>
            <p className="text-xs text-gray-400 mb-4">Total kg (sets × reps × weight)</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} unit="kg" />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={v => [`${v} kg`, 'Volume']} />
                <Bar dataKey="volume" fill="#3B82F6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Workout duration */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Workout duration</h2>
            <p className="text-xs text-gray-400 mb-4">Estimated time per session (mins)</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} unit="m" />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={v => [`${v} mins`, 'Duration']} />
                <Line type="monotone" dataKey="minutes" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Strength progression */}
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-gray-900">Strength progression</h2>
              <select
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600"
                value={selectedExercise ?? ''}
                onChange={e => setSelectedExercise(e.target.value)}
              >
                {exercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-400 mb-4">Max weight per session</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={strengthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} unit="kg" />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={v => [`${v} kg`, 'Max weight']} />
                <Line type="monotone" dataKey="maxKg" stroke="#1D9E75" strokeWidth={2} dot={{ fill: '#1D9E75', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

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

function buildVolumeData(logs, sessions) {
  const sessionMap = Object.fromEntries(sessions.map(s => [s.id, s.completed_at]))
  const bySession = {}
  logs.forEach(l => {
    const date = sessionMap[l.session_id]
    if (!date) return
    const key = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    bySession[key] = (bySession[key] ?? 0) + ((l.reps ?? 0) * (l.weight_kg ?? 0))
  })
  return Object.entries(bySession).slice(-10).map(([date, volume]) => ({ date, volume: Math.round(volume) }))
}

function buildTimeData(sessions) {
  return sessions
    .filter(s => s.started_at && s.completed_at)
    .slice(-10)
    .map(s => ({
      date: new Date(s.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      minutes: Math.round((new Date(s.completed_at) - new Date(s.started_at)) / 60000)
    }))
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
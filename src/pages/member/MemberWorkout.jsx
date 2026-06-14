import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Play, CheckCircle, SkipForward, Dumbbell, Check, Timer } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const todayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
const STORAGE_KEY = 'fitflow_workout_state'

export default function MemberWorkout() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState([])
  const [planId, setPlanId] = useState(null)
  const [started, setStarted] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [sets, setSets] = useState({})
  const [restTimer, setRestTimer] = useState(null)
  const [restStartedAt, setRestStartedAt] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const restRef = useRef(null)
  const elapsedRef = useRef(null)

  useEffect(() => {
    if (user) loadTodayExercises()
  }, [user])

  // Restore state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const state = JSON.parse(saved)
        if (state.userId === user?.id && state.day === todayName) {
          setStarted(true)
          setStartedAt(state.startedAt)
          setSets(state.sets)
          setPlanId(state.planId)
          if (state.restStartedAt && state.restDuration) {
            const remaining = state.restDuration - Math.floor((Date.now() - state.restStartedAt) / 1000)
            if (remaining > 0) {
              // Store original values so the interval effect can use them
              setRestStartedAt(state.restStartedAt)
              setRestTimer(state.restDuration) // set original duration, interval recalculates
            }
          }
        }
      } catch (e) { localStorage.removeItem(STORAGE_KEY) }
    }
  }, [user])

  // Save state to localStorage whenever key state changes
  const saveToStorage = useCallback((overrides = {}) => {
    if (!started && !overrides.started) return
    const state = {
      userId: user?.id,
      day: todayName,
      startedAt: overrides.startedAt ?? startedAt,
      sets: overrides.sets ?? sets,
      planId: overrides.planId ?? planId,
      restStartedAt: overrides.restStartedAt ?? restStartedAt,
      restDuration: overrides.restDuration ?? null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [user, started, startedAt, sets, planId, restStartedAt])

  // Elapsed workout timer — date-based so it works across tab switches
  useEffect(() => {
    if (!started || !startedAt) return
    function tick() {
      setElapsedSeconds(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    }
    tick()
    elapsedRef.current = setInterval(tick, 1000)
    return () => clearInterval(elapsedRef.current)
  }, [started, startedAt])

  // Rest timer — date-based
  useEffect(() => {
  if (!restStartedAt) return
  const originalDuration = restTimer
  const startRest = restStartedAt

  clearInterval(restRef.current)
  restRef.current = setInterval(() => {
    const rem = originalDuration - Math.floor((Date.now() - startRest) / 1000)
    if (rem <= 0) {
      setRestTimer(null)
      setRestStartedAt(null)
      clearInterval(restRef.current)
    } else {
      setRestTimer(rem)
    }
  }, 500)

  return () => clearInterval(restRef.current)
}, [restStartedAt])

  async function loadTodayExercises() {
    const { data: assignment } = await supabase
      .from('plan_assignments')
      .select('*, workout_plans(id, name)')
      .eq('member_id', user.id)
      .eq('is_active', true)
      .single()

    if (!assignment) { setLoading(false); return }
    setPlanId(assignment.workout_plans.id)

    const { data: exs } = await supabase
      .from('plan_exercises')
      .select('*')
      .eq('plan_id', assignment.workout_plans.id)
      .eq('day_of_week', todayName)
      .order('sort_order')

    setExercises(exs ?? [])

    // Check if we have saved state for these exercises
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      const initialSets = {}
        ; (exs ?? []).forEach(ex => {
          initialSets[ex.id] = Array.from({ length: ex.sets || 3 }, () => ({
            reps: ex.reps ?? '',
            kg: ex.weight_kg ?? '',
            done: false
          }))
        })
      setSets(initialSets)
    }
    setLoading(false)
  }

  function startWorkout() {
    const now = new Date().toISOString()
    const initial = {}
    exercises.forEach(ex => {
      initial[ex.id] = Array.from({ length: ex.sets }, () => ({
        reps: ex.reps ?? '',
        kg: ex.weight_kg ?? '',
        done: false,
      }))
    })
    setSets(initial)
    setStartedAt(now)
    setStarted(true)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      userId: user?.id,
      day: todayName,
      startedAt: now,
      sets: initial,
      planId,
    }))
  }

  function updateSet(exId, setIdx, field, value) {
    setSets(prev => {
      const updated = {
        ...prev,
        [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s),
      }
      saveToStorage({ sets: updated })
      return updated
    })
  }

  function completeSet(exId, setIdx) {
    setSets(prev => {
      const updated = {
        ...prev,
        [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, done: true } : s),
      }
      saveToStorage({ sets: updated })
      return updated
    })
    const now = Date.now()
    const duration = 90
    setRestStartedAt(now)
    setRestTimer(duration)
    saveToStorage({ restStartedAt: now, restDuration: duration })
  }

  function skipRest() {
    clearInterval(restRef.current)
    setRestTimer(null)
    setRestStartedAt(null)
  }

  function formatTime(s) {
    if (!s && s !== 0) return '0:00'
    const abs = Math.abs(s)
    return `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
  }

  function formatElapsed(s) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const allDone = exercises.length > 0 && exercises.every(ex =>
    sets[ex.id]?.every(s => s.done)
  )

  async function finishWorkout() {
    setSaving(true)
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        member_id: user.id,
        plan_id: planId,
        day_name: todayName,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) { console.error(error); setSaving(false); return }

    const setLogs = []
    exercises.forEach(ex => {
      const exSets = sets[ex.id] ?? []
      exSets.forEach((s, i) => {
        if (s.done) {
          setLogs.push({
            session_id: session.id,
            exercise_name: ex.exercise_name,
            set_number: i + 1,
            reps: parseInt(s.reps) || null,
            weight_kg: parseFloat(s.kg) || null,
          })
        }
      })
    })

    if (setLogs.length) await supabase.from('set_logs').insert(setLogs)
    localStorage.removeItem(STORAGE_KEY)
    clearInterval(elapsedRef.current)
    clearInterval(restRef.current)
    setSaving(false)
    setDone(true)
  }

  if (loading) return <div className="h-48 card animate-pulse" />

  if (done) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center">
        <CheckCircle size={32} className="text-brand-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Workout logged!</h2>
      <p className="text-gray-500">Duration: {formatElapsed(elapsedSeconds)}</p>
      <p className="text-gray-500">Great session. See you next time 💪</p>
      <button className="btn btn-primary" onClick={() => {
        setDone(false); setStarted(false); setStartedAt(null)
        setElapsedSeconds(0); setSets({})
      }}>Done</button>
    </div>
  )

  if (!exercises.length) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Dumbbell size={40} className="text-gray-300" />
      <p className="text-gray-500">No exercises for {todayName}.</p>
      <p className="text-sm text-gray-400">This is likely a rest day — enjoy it!</p>
    </div>
  )

  if (!started) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center">
        <Dumbbell size={28} className="text-brand-400" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Today — {todayName}</h2>
        <p className="text-gray-500 mt-1">{exercises.length} exercises ready</p>
      </div>
      <ul className="card w-full max-w-sm divide-y divide-gray-100">
        {exercises.map(ex => (
          <li key={ex.id} className="py-2.5 flex justify-between items-center">
            <span className="text-sm text-gray-900">{ex.exercise_name}</span>
            <span className="text-xs text-gray-500">{ex.sets} × {ex.reps}{ex.weight_kg ? ` · ${ex.weight_kg}kg` : ''}</span>
          </li>
        ))}
      </ul>
      <button className="btn btn-primary px-8" onClick={startWorkout}>
        <Play size={16} /> Start workout
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Workout timer bar */}
      <div className="bg-gray-900 text-white rounded-xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer size={16} className="text-brand-400" />
          <div>
            <p className="text-xs opacity-60">Workout time</p>
            <p className="text-xl font-semibold tabular-nums">{formatElapsed(elapsedSeconds)}</p>
          </div>
        </div>
        <button
          className={`btn btn-sm ${allDone ? 'btn-primary' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
          onClick={finishWorkout}
          disabled={saving}
        >
          {saving
            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <><Check size={14} /> Finish</>
          }
        </button>
      </div>

      {/* Rest timer */}
      {restTimer !== null && (
        <div className="sticky top-0 z-10 bg-brand-400 text-white rounded-xl px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">Rest timer</p>
            <p className="text-2xl font-semibold tabular-nums">{formatTime(restTimer)}</p>
          </div>
          <button onClick={skipRest} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-all">
            <SkipForward size={14} /> Skip
          </button>
        </div>
      )}

      <h1 className="text-lg font-semibold text-gray-900">{todayName}</h1>

      {exercises.map(ex => {
        const exSets = sets[ex.id] ?? []
        const doneSets = exSets.filter(s => s.done).length
        return (
          <div key={ex.id} className="card overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">{ex.exercise_name}</h3>
              <span className="text-xs text-gray-500">{doneSets}/{ex.sets} sets</span>
            </div>
            <div className="grid grid-cols-[60px_1fr_1fr_48px] gap-2 px-5 py-2 text-xs text-gray-400 border-b border-gray-50">
              <span>Set</span><span>Reps</span><span>Weight (kg)</span><span></span>
            </div>
            {exSets.map((s, i) => (
              <div key={i} className={`grid grid-cols-[60px_1fr_1fr_48px] gap-2 items-center px-5 py-2.5 border-b border-gray-50 last:border-0 transition-colors ${s.done ? 'bg-brand-50' : ''}`}>
                <span className="text-sm text-gray-500">Set {i + 1}</span>
                <input className="input py-1.5 text-center" type="number" min="1" placeholder="10"
                  value={s.reps} onChange={e => updateSet(ex.id, i, 'reps', e.target.value)} disabled={s.done} />
                <input className="input py-1.5 text-center" type="number" min="0" step="0.5" placeholder="20"
                  value={s.kg} onChange={e => updateSet(ex.id, i, 'kg', e.target.value)} disabled={s.done} />
                <button onClick={() => !s.done && completeSet(ex.id, i)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${s.done ? 'bg-brand-400 border-brand-400 text-white' : 'border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-400'}`}>
                  <Check size={14} />
                </button>
              </div>
            ))}
            {ex.notes && (
              <div className="px-5 py-2.5 bg-amber-50 text-xs text-amber-700 border-t border-amber-100">{ex.notes}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
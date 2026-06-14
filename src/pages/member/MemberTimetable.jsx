import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { CalendarDays, Dumbbell } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]

export default function MemberTimetable() {
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadPlan()
  }, [user])

  async function loadPlan() {
    const { data: assignment, error } = await supabase
      .from('plan_assignments')
      .select('*, workout_plans(id, name, goal, trainer_notes)')
      .eq('member_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    console.log('assignment:', assignment, 'error:', error)

    if (!assignment) { setLoading(false); return }
    setPlan(assignment)

    const { data: exs } = await supabase
      .from('plan_exercises')
      .select('*')
      .eq('plan_id', assignment.workout_plans.id)
      .order('sort_order')

    console.log('exercises:', exs)
    setExercises(exs ?? [])
    setLoading(false)
  }

  if (loading) return <LoadingSkeleton />

  if (!plan) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <CalendarDays size={40} className="text-gray-300" />
      <p className="text-gray-500">No plan assigned yet.</p>
      <p className="text-sm text-gray-400">Your trainer will set up your timetable soon.</p>
    </div>
  )

  // Group exercises by day
  const byDay = {}
  DAYS.forEach(d => byDay[d] = [])
  exercises.forEach(e => { if (byDay[e.day_of_week]) byDay[e.day_of_week].push(e) })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">My timetable</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {plan.workout_plans.name} · Goal: {plan.workout_plans.goal}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          {DAYS.map(day => {
            const exs = byDay[day]
            const isToday = day === today
            const isRest = exs.length === 0

            return (
              <div key={day} className={`card transition-all ${isToday ? 'ring-2 ring-brand-400' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">{day}</h3>
                  <div className="flex gap-2">
                    {isToday && <span className="badge badge-green">Today</span>}
                    {isRest && <span className="badge badge-gray">Rest day</span>}
                  </div>
                </div>

                {isRest ? (
                  <p className="text-sm text-gray-400">Active recovery / stretching</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {exs.map(e => (
                      <li key={e.id} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Dumbbell size={14} className="text-brand-400 shrink-0" />
                          <span className="text-sm text-gray-900">{e.exercise_name}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {e.sets} × {e.reps}{e.weight_kg ? ` · ${e.weight_kg} kg` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        {/* Notes panel */}
        <div className="flex flex-col gap-4">
          {plan.workout_plans.trainer_notes && (
            <div className="card bg-brand-50 border-brand-100">
              <h3 className="text-sm font-semibold text-brand-600 mb-2">Trainer notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{plan.workout_plans.trainer_notes}</p>
            </div>
          )}
          {plan.trainer_notes && (
            <div className="card bg-amber-50 border-amber-100">
              <h3 className="text-sm font-semibold text-amber-700 mb-2">Personal notes for you</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{plan.trainer_notes}</p>
            </div>
          )}

          {/* Calendar heatmap placeholder */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">June 2026</h3>
            <MiniCalendar userId={null} />
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniCalendar() {
  const days = ['S','M','T','W','T','F','S']
  const dates = Array.from({ length: 30 }, (_, i) => i + 1)
  const today = new Date().getDate()

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map((d, i) => (
          <div key={i} className="text-center text-xs text-gray-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dates.map(d => (
          <div
            key={d}
            className={`aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-all
              ${d === today ? 'border border-brand-400 text-brand-600' : 'text-gray-500'}
            `}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card h-24 animate-pulse bg-gray-50" />
      ))}
    </div>
  )
}

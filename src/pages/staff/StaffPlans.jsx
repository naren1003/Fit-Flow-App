import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Save, ChevronDown, ChevronUp, UserCheck, X } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function StaffPlans() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // 'list' | 'editor'
  const [editingPlan, setEditingPlan] = useState(null)
  const [saving, setSaving] = useState(false)
  const [expandedDay, setExpandedDay] = useState('Monday')
  const [assignModal, setAssignModal] = useState(null) // plan object
  const [assignMemberId, setAssignMemberId] = useState('')
  const [assignNotes, setAssignNotes] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => { loadAll() }, [user])

  async function loadAll() {
    const [{ data: plansData }, { data: membersData }] = await Promise.all([
      supabase.from('workout_plans').select('*, plan_exercises(*), plan_assignments(id, is_active, profiles(full_name))').eq('trainer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'member').eq('assigned_trainer_id', user.id).order('full_name'),
    ])
    setPlans(plansData ?? [])
    setMembers(membersData ?? [])
    setLoading(false)
  }

  function newPlan() {
    const blank = {
      id: null,
      name: '',
      goal: 'Muscle gain',
      trainer_id: user.id,
      plan_exercises: DAYS.map(day => ({ day_of_week: day, exercise_name: '', sets: '', reps: '', weight_kg: '', notes: '', _key: crypto.randomUUID() })),
    }
    setEditingPlan(blank)
    setExpandedDay('Monday')
    setView('editor')
  }

  function editPlan(plan) {
    // Ensure all 7 days exist
    const existing = plan.plan_exercises ?? []
    const merged = DAYS.map(day => {
      const rows = existing.filter(e => e.day_of_week === day)
      if (rows.length) return rows.map(r => ({ ...r, _key: r.id ?? crypto.randomUUID() }))
      return [{ day_of_week: day, exercise_name: '', sets: '', reps: '', weight_kg: '', notes: '', _key: crypto.randomUUID() }]
    }).flat()
    setEditingPlan({ ...plan, plan_exercises: merged })
    setExpandedDay('Monday')
    setView('editor')
  }

  function updateExercise(key, field, value) {
    setEditingPlan(p => ({
      ...p,
      plan_exercises: p.plan_exercises.map(e => e._key === key ? { ...e, [field]: value } : e),
    }))
  }

  function addExercise(day) {
    setEditingPlan(p => ({
      ...p,
      plan_exercises: [...p.plan_exercises, { day_of_week: day, exercise_name: '', sets: '', reps: '', weight_kg: '', notes: '', _key: crypto.randomUUID() }],
    }))
  }

  function removeExercise(key) {
    setEditingPlan(p => ({
      ...p,
      plan_exercises: p.plan_exercises.filter(e => e._key !== key),
    }))
  }

  async function savePlan() {
    if (!editingPlan.name.trim()) return alert('Give the plan a name.')
    setSaving(true)

    // Upsert the plan itself
    const { data: savedPlan, error } = await supabase
      .from('workout_plans')
      .upsert({ id: editingPlan.id || undefined, name: editingPlan.name, goal: editingPlan.goal, trainer_id: user.id })
      .select()
      .single()

    if (error) { alert('Error saving plan: ' + error.message); setSaving(false); return }

    // Delete old exercises and reinsert
    await supabase.from('plan_exercises').delete().eq('plan_id', savedPlan.id)

    const exercises = editingPlan.plan_exercises
      .filter(e => e.exercise_name.trim())
      .map(e => ({
        plan_id: savedPlan.id,
        day_of_week: e.day_of_week,
        exercise_name: e.exercise_name,
        sets: parseInt(e.sets) || null,
        reps: parseInt(e.reps) || null,
        weight_kg: parseFloat(e.weight_kg) || null,
        notes: e.notes || null,
      }))

    if (exercises.length) {
      await supabase.from('plan_exercises').insert(exercises)
    }

    setSaving(false)
    setView('list')
    loadAll()
  }

  async function assignPlan() {
    if (!assignMemberId) return
    setAssigning(true)
    // Deactivate existing
    await supabase.from('plan_assignments').update({ is_active: false }).eq('member_id', assignMemberId)
    // Assign new
    await supabase.from('plan_assignments').insert({
      plan_id: assignModal.id,
      member_id: assignMemberId,
      trainer_id: user.id,
      is_active: true,
      trainer_notes: assignNotes || null,
    })
    setAssigning(false)
    setAssignModal(null)
    setAssignMemberId('')
    setAssignNotes('')
    loadAll()
  }

  async function deletePlan(planId) {
    if (!confirm('Delete this plan?')) return
    await supabase.from('plan_exercises').delete().eq('plan_id', planId)
    await supabase.from('plan_assignments').delete().eq('plan_id', planId)
    await supabase.from('workout_plans').delete().eq('id', planId)
    loadAll()
  }

  if (view === 'editor' && editingPlan) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <button className="text-sm text-gray-400 hover:text-gray-600 mb-1" onClick={() => setView('list')}>← Back to plans</button>
            <h1 className="text-xl font-semibold text-gray-900">{editingPlan.id ? 'Edit plan' : 'New plan'}</h1>
          </div>
          <button className="btn btn-primary" onClick={savePlan} disabled={saving}>
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Save plan</>}
          </button>
        </div>

        {/* Plan meta */}
        <div className="card mb-4 grid grid-cols-2 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="label">Plan name *</label>
            <input className="input" placeholder="e.g. Strength Phase 1" value={editingPlan.name} onChange={e => setEditingPlan(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="label">Goal</label>
            <select className="input" value={editingPlan.goal} onChange={e => setEditingPlan(p => ({ ...p, goal: e.target.value }))}>
              <option>Muscle gain</option>
              <option>Fat loss</option>
              <option>Endurance</option>
              <option>General fitness</option>
              <option>Maintenance</option>
            </select>
          </div>
        </div>

        {/* Days */}
        <div className="flex flex-col gap-2">
          {DAYS.map(day => {
            const dayExercises = editingPlan.plan_exercises.filter(e => e.day_of_week === day)
            const isOpen = expandedDay === day
            return (
              <div key={day} className="card p-0 overflow-hidden">
                <button
                  className="flex items-center justify-between w-full px-4 py-3 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedDay(isOpen ? null : day)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{day}</span>
                    <span className="text-xs text-gray-400">
                      {dayExercises.filter(e => e.exercise_name).length} exercise{dayExercises.filter(e => e.exercise_name).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-4">
                    {dayExercises.length === 0 && (
                      <p className="text-xs text-gray-400 mb-3">No exercises yet. Add one below.</p>
                    )}
                    <div className="flex flex-col gap-3">
                      {dayExercises.map(ex => (
                        <div key={ex._key} className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-12 md:col-span-4">
                            <input className="input text-sm" placeholder="Exercise name" value={ex.exercise_name} onChange={e => updateExercise(ex._key, 'exercise_name', e.target.value)} />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <input className="input text-sm" placeholder="Sets" type="number" min="1" value={ex.sets} onChange={e => updateExercise(ex._key, 'sets', e.target.value)} />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <input className="input text-sm" placeholder="Reps" type="number" min="1" value={ex.reps} onChange={e => updateExercise(ex._key, 'reps', e.target.value)} />
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <input className="input text-sm" placeholder="kg" type="number" min="0" step="2.5" value={ex.weight_kg} onChange={e => updateExercise(ex._key, 'weight_kg', e.target.value)} />
                          </div>
                          <div className="col-span-11 md:col-span-1">
                            <input className="input text-sm" placeholder="Notes" value={ex.notes} onChange={e => updateExercise(ex._key, 'notes', e.target.value)} />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button className="p-2 text-gray-300 hover:text-red-400 transition-colors" onClick={() => removeExercise(ex._key)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="mt-3 text-sm text-brand-400 hover:text-brand-600 flex items-center gap-1 transition-colors" onClick={() => addExercise(day)}>
                      <Plus size={14} /> Add exercise
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Workout plans</h1>
        <button className="btn btn-primary" onClick={newPlan}><Plus size={16} /> Create plan</button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}</div>
      ) : plans.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-400 text-sm mb-3">No plans yet.</p>
          <button className="btn btn-primary mx-auto" onClick={newPlan}><Plus size={16} /> Create your first plan</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {plans.map(plan => {
            const exCount = plan.plan_exercises?.length ?? 0
            const assignedCount = plan.plan_assignments?.filter(a => a.is_active).length ?? 0
            return (
              <div key={plan.id} className="card flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">{plan.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{plan.goal} · {exCount} exercises · {assignedCount} member{assignedCount !== 1 ? 's' : ''} active</p>
                  </div>
                  <span className={`badge ${plan.goal === 'Fat loss' ? 'badge-amber' : plan.goal === 'Muscle gain' ? 'badge-blue' : 'badge-green'}`}>{plan.goal}</span>
                </div>

                {/* Exercise preview */}
                {plan.plan_exercises?.slice(0, 3).map(ex => (
                  <div key={ex.id} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                    {ex.exercise_name} — {ex.sets}×{ex.reps}{ex.weight_kg ? ` · ${ex.weight_kg}kg` : ''}
                  </div>
                ))}
                {exCount > 3 && <p className="text-xs text-gray-400">+{exCount - 3} more exercises</p>}

                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <button className="btn text-xs py-1.5" onClick={() => editPlan(plan)}>Edit</button>
                  <button className="btn btn-primary text-xs py-1.5" onClick={() => { setAssignModal(plan); setAssignMemberId(''); setAssignNotes('') }}>
                    <UserCheck size={13} /> Assign
                  </button>
                  <button className="btn btn-danger text-xs py-1.5 ml-auto" onClick={() => deletePlan(plan.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Assign modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Assign "{assignModal.name}"</h2>
              <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="label">Member *</label>
                <select className="input" value={assignMemberId} onChange={e => setAssignMemberId(e.target.value)}>
                  <option value="">Select member…</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Trainer notes (optional)</label>
                <textarea className="input min-h-[70px] resize-none" placeholder="Focus on form, increase weight next week…" value={assignNotes} onChange={e => setAssignNotes(e.target.value)} />
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                This will replace the member's current active plan.
              </p>
              <div className="flex gap-2 justify-end">
                <button className="btn" onClick={() => setAssignModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={assignPlan} disabled={assigning || !assignMemberId}>
                  {assigning ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Assign plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

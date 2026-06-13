import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Users, AlertTriangle, Dumbbell } from 'lucide-react'

export default function StaffDashboard() {
  const { user, profile } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadMembers()
  }, [user])

  async function loadMembers() {
    const { data } = await supabase
      .from('profiles')
      .select('*, plan_assignments(is_active, trainer_notes, workout_plans(name, goal))')
      .eq('role', 'member')
      .eq('assigned_trainer_id', user.id)
      .order('full_name')

    setMembers(data ?? [])
    setLoading(false)
  }

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const atRisk = members.filter(m => m.membership_status === 'expiring' || m.membership_status === 'expired')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Morning, {profile?.full_name?.split(' ')[0] ?? 'Trainer'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{today}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card">
          <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center mb-3">
            <Users size={16} className="text-brand-400" />
          </div>
          <p className="text-xs text-gray-500">My members</p>
          <p className="text-2xl font-semibold text-gray-900">{loading ? '…' : members.length}</p>
        </div>
        <div className="card">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
            <Dumbbell size={16} className="text-blue-500" />
          </div>
          <p className="text-xs text-gray-500">With active plan</p>
          <p className="text-2xl font-semibold text-gray-900">
            {loading ? '…' : members.filter(m => m.plan_assignments?.some(p => p.is_active)).length}
          </p>
        </div>
        <div className="card">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-xs text-gray-500">Need attention</p>
          <p className="text-2xl font-semibold text-gray-900">{loading ? '…' : atRisk.length}</p>
        </div>
      </div>

      {/* Members to train today */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Members to train today</h2>
          {loading ? (
            <div className="flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />)}</div>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No members assigned yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map(m => {
                const activePlan = m.plan_assignments?.find(p => p.is_active)
                return (
                  <li key={m.id} className="py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-sm font-semibold shrink-0">
                      {m.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {activePlan ? `${activePlan.workout_plans?.name} · ${activePlan.workout_plans?.goal}` : 'No active plan'}
                      </p>
                    </div>
                    {m.membership_status === 'expired'
                      ? <span className="badge badge-red">Expired</span>
                      : m.membership_status === 'expiring'
                        ? <span className="badge badge-amber">Expiring</span>
                        : activePlan
                          ? <span className="badge badge-green">On track</span>
                          : <span className="badge badge-gray">No plan</span>
                    }
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Trainer notes quick view */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Your notes</h2>
          {loading ? (
            <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map(m => {
                const activePlan = m.plan_assignments?.find(p => p.is_active)
                if (!activePlan?.trainer_notes) return null
                return (
                  <li key={m.id} className="py-3">
                    <p className="text-xs font-medium text-gray-700">{m.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{activePlan.trainer_notes}</p>
                  </li>
                )
              }).filter(Boolean)}
              {members.every(m => !m.plan_assignments?.find(p => p.is_active)?.trainer_notes) && (
                <li className="py-4 text-center text-sm text-gray-400">No notes yet.</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

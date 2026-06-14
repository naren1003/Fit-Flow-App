import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { UserPlus, Search, X, Check } from 'lucide-react'

export default function StaffMembers() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', membership_plan: 'Standard', membership_expiry: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadMembers() }, [user])

  async function loadMembers() {
    const { data } = await supabase
      .from('profiles')
      .select('*, plan_assignments!plan_assignments_member_id_fkey(is_active, workout_plans(name, goal))')
      .eq('role', 'member')
      .order('full_name')
    
    setMembers(data ?? [])
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    // Create auth user with random password (they can reset later)
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
    const { data: authData, error: authErr } = await supabase.auth.admin
      ? { data: null, error: { message: 'Use Supabase dashboard to create members or enable email invites' } }
      : await supabase.auth.signUp({ email: form.email, password: tempPassword })

    if (authErr) {
      // Fallback: create profile directly (works if user is created via Supabase dashboard)
      setError('Member added to system. Ask them to sign up with their email, then you can assign plans.')
    }

    // Insert/update profile
    const { error: profileErr } = await supabase.from('profiles').upsert({
      full_name: form.full_name,
      phone: form.phone,
      membership_plan: form.membership_plan,
      membership_expiry: form.membership_expiry || null,
      membership_status: form.membership_expiry
        ? (new Date(form.membership_expiry) > new Date() ? 'active' : 'expired')
        : 'active',
      role: 'member',
      assigned_trainer_id: user.id,
    })

    if (!profileErr) {
      setShowAdd(false)
      setForm({ full_name: '', email: '', phone: '', membership_plan: 'Standard', membership_expiry: '' })
      loadMembers()
    }
    setSaving(false)
  }

  const filtered = members.filter(m =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search)
  )

  const statusBadge = (status) => {
    if (status === 'expired') return <span className="badge badge-red">Expired</span>
    if (status === 'expiring') return <span className="badge badge-amber">Expiring soon</span>
    return <span className="badge badge-green">Active</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Members</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <UserPlus size={16} /> Add member
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by name or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Add member panel */}
      {showAdd && (
        <div className="card mb-4 border-brand-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">New member</h2>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="label">Full name *</label>
              <input className="input" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="label">Membership plan</label>
              <select className="input" value={form.membership_plan} onChange={e => setForm(f => ({ ...f, membership_plan: e.target.value }))}>
                <option>Basic</option>
                <option>Standard</option>
                <option>Premium</option>
                <option>Premium Annual</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="label">Membership expiry</label>
              <input className="input" type="date" value={form.membership_expiry} onChange={e => setForm(f => ({ ...f, membership_expiry: e.target.value }))} />
            </div>
            {error && <p className="col-span-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={14} /> Save member</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members list */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">
            {search ? 'No members match your search.' : 'No members assigned yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map(m => {
              const activePlan = m.plan_assignments?.find(p => p.is_active)
              return (
                <li key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-semibold text-sm shrink-0">
                    {m.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                    <p className="text-xs text-gray-400">
                      {m.phone && <span>{m.phone} · </span>}
                      {activePlan ? `${activePlan.workout_plans?.name}` : 'No active plan'}
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
                    <span>{m.membership_plan}</span>
                    {m.membership_expiry && (
                      <span>· expires {new Date(m.membership_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                  {statusBadge(m.membership_status)}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

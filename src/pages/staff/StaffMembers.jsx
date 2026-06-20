import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { UserPlus, Search, X, Check, Pencil, UserCheck, Trash2 } from 'lucide-react'

export default function StaffMembers() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [showLink, setShowLink] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkResult, setLinkResult] = useState(null) // found unclaimed profile
  const [linkSearching, setLinkSearching] = useState(false)
  const [linkError, setLinkError] = useState('')

  const [editingMember, setEditingMember] = useState(null)
  const [form, setForm] = useState({ full_name: '', phone: '', membership_plan: 'General Training', membership_expiry: '', membership_status: 'active' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (user) loadMembers() }, [user])

  async function loadMembers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'member')
      .eq('assigned_trainer_id', user.id)
      .order('full_name')
    setMembers(data ?? [])
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // ── Link existing member by email ──
  function openLink() {
    setLinkEmail('')
    setLinkResult(null)
    setLinkError('')
    setShowLink(true)
  }

  async function searchByEmail() {
    if (!linkEmail.trim()) return
    setLinkSearching(true)
    setLinkError('')
    setLinkResult(null)

    // We can't query auth.users directly from client, so we search profiles
    // joined conceptually via a profiles view that includes email.
    // Simplest: ask the member to share their user id, OR look up via a
    // 'pending_members' approach. Since profiles doesn't store email by
    // default, we add email to profiles at signup time (see signup flow).
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', linkEmail.trim().toLowerCase())
      .eq('role', 'member')
      .maybeSingle()

    if (error || !data) {
      setLinkError('No member found with that email. Ask them to sign up first at the login page.')
      setLinkSearching(false)
      return
    }

    if (data.assigned_trainer_id) {
      setLinkError('This member is already assigned to a trainer.')
      setLinkSearching(false)
      return
    }

    setLinkResult(data)
    setLinkSearching(false)
  }

  async function confirmLink() {
    if (!linkResult) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ assigned_trainer_id: user.id })
      .eq('id', linkResult.id)

    if (error) { showToast('Error: ' + error.message); setSaving(false); return }

    showToast(`${linkResult.full_name} added to your members!`)
    setShowLink(false)
    loadMembers()
    setSaving(false)

    // Open edit panel right after to set plan/expiry
    openEdit({ ...linkResult, assigned_trainer_id: user.id })
  }

  async function removeMember(member) {
    if (!confirm(`Remove ${member.full_name} from your members? Their account will still exist but won't be assigned to you.`)) return

    const { error } = await supabase
      .from('profiles')
      .update({ assigned_trainer_id: null })
      .eq('id', member.id)

    if (error) { showToast('Error: ' + error.message); return }

    showToast(`${member.full_name} removed.`)
    loadMembers()
  }

  // ── Edit member details ──
  function openEdit(m) {
    setEditingMember(m)
    setForm({
      full_name: m.full_name ?? '',
      phone: m.phone ?? '',
      membership_plan: m.membership_plan ?? 'Standard',
      membership_expiry: m.membership_expiry ?? '',
      membership_status: m.membership_status ?? 'active',
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const expiry = form.membership_expiry || null
    const status = expiry
      ? (new Date(expiry) > new Date() ? 'active' : 'expired')
      : form.membership_status

    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      phone: form.phone,
      membership_plan: form.membership_plan,
      membership_expiry: expiry,
      membership_status: status,
    }).eq('id', editingMember.id)

    if (error) { showToast('Error: ' + error.message); setSaving(false); return }

    showToast('Member updated!')
    setEditingMember(null)
    loadMembers()
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
        <button className="btn btn-primary" onClick={openLink}>
          <UserPlus size={16} /> Add member
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 mb-4 text-xs text-blue-700">
        Members must sign up themselves at the login page first. Then add them here using their email.
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Link by email panel */}
      {showLink && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Add member by email</h2>
            <button onClick={() => setShowLink(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              className="input flex-1"
              type="email"
              placeholder="member@example.com"
              value={linkEmail}
              onChange={e => setLinkEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchByEmail()}
            />
            <button className="btn" onClick={searchByEmail} disabled={linkSearching}>
              {linkSearching ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Search size={14} />}
            </button>
          </div>

          {linkError && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">{linkError}</p>}

          {linkResult && (
            <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-brand-600 font-semibold text-sm">
                {linkResult.full_name?.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{linkResult.full_name}</p>
                <p className="text-xs text-gray-500">{linkEmail}</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={confirmLink} disabled={saving}>
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserCheck size={13} /> Add</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit panel */}
      {editingMember && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Edit member</h2>
            <button onClick={() => setEditingMember(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="label">Full name</label>
              <input className="input" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="label">Membership plan</label>
              <select className="input" value={form.membership_plan} onChange={e => setForm(f => ({ ...f, membership_plan: e.target.value }))}>
                <option>General Training</option>
                <option>Personal Training</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="label">Membership expiry</label>
              <input className="input" type="date" value={form.membership_expiry} onChange={e => setForm(f => ({ ...f, membership_expiry: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="label">Status</label>
              <select className="input" value={form.membership_status} onChange={e => setForm(f => ({ ...f, membership_status: e.target.value }))}>
                <option value="active">Active</option><option value="expiring">Expiring soon</option><option value="expired">Expired</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" className="btn" onClick={() => setEditingMember(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={14} /> Update</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members list */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">{search ? 'No members match your search.' : 'No members yet. Add one by their email above.'}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map(m => (
              <li key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-semibold text-sm shrink-0">
                  {m.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                  <p className="text-xs text-gray-400">
                    {m.phone && <span>{m.phone} · </span>}
                    {m.membership_plan}
                    {m.membership_expiry && ` · expires ${new Date(m.membership_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>
                {statusBadge(m.membership_status)}
                <button className="btn btn-sm" onClick={() => openEdit(m)}><Pencil size={13} /> Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => removeMember(m)}><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
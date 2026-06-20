import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ShieldCheck, Clock, UserX, ShieldAlert } from 'lucide-react'

export default function StaffTeam() {
  const { profile } = useAuth()
  const [pending, setPending] = useState([])
  const [approved, setApproved] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => { loadStaff() }, [])

  async function loadStaff() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'staff')
      .order('created_at', { ascending: false })

    setPending((data ?? []).filter(s => s.staff_status === 'pending'))
    setApproved((data ?? []).filter(s => s.staff_status === 'approved' || s.is_admin))
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function approve(staffMember) {
    const { error } = await supabase
      .from('profiles')
      .update({ staff_status: 'approved' })
      .eq('id', staffMember.id)
    if (error) { showToast('Error: ' + error.message); return }
    showToast(`${staffMember.full_name} approved as staff!`)
    loadStaff()
  }

  async function reject(staffMember) {
    if (!confirm(`Reject ${staffMember.full_name}'s staff request? Their account will remain but without staff access.`)) return
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'member', staff_status: null })
      .eq('id', staffMember.id)
    if (error) { showToast('Error: ' + error.message); return }
    showToast('Request rejected.')
    loadStaff()
  }

  async function revoke(staffMember) {
    if (!confirm(`Remove staff access for ${staffMember.full_name}?`)) return
    const { error } = await supabase
      .from('profiles')
      .update({ staff_status: 'pending' })
      .eq('id', staffMember.id)
    if (error) { showToast('Error: ' + error.message); return }
    showToast('Staff access revoked.')
    loadStaff()
  }

  if (!profile?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <ShieldAlert size={40} className="text-gray-300" />
        <p className="text-gray-500">Only gym admins can manage staff.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Team management</h1>

      {/* Pending approvals */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-900">Pending approval</h2>
          {pending.length > 0 && <span className="badge badge-amber">{pending.length}</span>}
        </div>
        {loading ? (
          <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No pending staff requests.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pending.map(s => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 text-sm font-semibold shrink-0">
                  {s.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
                <button className="btn btn-sm" onClick={() => reject(s)}><UserX size={13} /> Reject</button>
                <button className="btn btn-primary btn-sm" onClick={() => approve(s)}><ShieldCheck size={13} /> Approve</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Active staff */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-gray-900">Active staff</h2>
        </div>
        {loading ? (
          <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
        ) : approved.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No active staff yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {approved.map(s => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-sm font-semibold shrink-0">
                  {s.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
                {s.is_admin
                  ? <span className="badge badge-blue">Admin</span>
                  : <span className="badge badge-green">Staff</span>
                }
                {!s.is_admin && (
                  <button className="btn btn-sm btn-danger" onClick={() => revoke(s)}><UserX size={13} /> Revoke</button>
                )}
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
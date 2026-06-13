import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ScanLine, Search, Check } from 'lucide-react'

export default function StaffAttendance() {
  const { user } = useAuth()
  const [log, setLog] = useState([])
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => { loadAll() }, [user])

  async function loadAll() {
    const today = new Date().toISOString().split('T')[0]
    const [{ data: logData }, { data: membersData }] = await Promise.all([
      supabase.from('attendance_log').select('*, profiles(full_name)').gte('checked_in_at', today + 'T00:00:00').order('checked_in_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, membership_status').eq('role', 'member').eq('assigned_trainer_id', user.id).order('full_name'),
    ])
    setLog(logData ?? [])
    setMembers(membersData ?? [])
    setLoading(false)
  }

  function handleSearch(val) {
    setSearch(val)
    if (!val.trim()) { setFiltered([]); return }
    const checkedInIds = new Set(log.map(l => l.member_id))
    setFiltered(
      members.filter(m =>
        m.full_name.toLowerCase().includes(val.toLowerCase()) &&
        !checkedInIds.has(m.id)
      )
    )
  }

  async function checkIn(member) {
    setCheckingIn(member.id)
    const { error } = await supabase.from('attendance_log').insert({ member_id: member.id, checked_in_at: new Date().toISOString() })
    if (!error) {
      showToast(`${member.full_name} checked in!`)
      setSearch('')
      setFiltered([])
      loadAll()
    }
    setCheckingIn(null)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const todayDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-400 mt-0.5">{todayDate}</p>
      </div>

      {/* Check-in search */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <ScanLine size={16} className="text-brand-400" /> Check in a member
        </h2>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search member name…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {filtered.length > 0 && (
          <ul className="mt-2 border border-gray-100 rounded-lg divide-y divide-gray-50 overflow-hidden">
            {filtered.map(m => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-xs font-semibold shrink-0">
                  {m.full_name.charAt(0)}
                </div>
                <span className="flex-1 text-sm text-gray-700">{m.full_name}</span>
                {m.membership_status === 'expired'
                  ? <span className="badge badge-red text-[10px]">Expired</span>
                  : <span className="badge badge-green text-[10px]">Active</span>
                }
                <button
                  className="btn btn-primary text-xs py-1"
                  onClick={() => checkIn(m)}
                  disabled={checkingIn === m.id}
                >
                  {checkingIn === m.id
                    ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><Check size={12} /> Check in</>
                  }
                </button>
              </li>
            ))}
          </ul>
        )}

        {search && filtered.length === 0 && (
          <p className="text-xs text-gray-400 mt-2 px-1">
            {members.some(m => m.full_name.toLowerCase().includes(search.toLowerCase()))
              ? 'That member is already checked in today.'
              : 'No member found.'}
          </p>
        )}
      </div>

      {/* Today's log */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Today's check-ins</h2>
          <span className="badge badge-green">{log.length} total</span>
        </div>

        {loading ? (
          <div className="p-4 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : log.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">No check-ins yet today.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {log.map(entry => (
              <li key={entry.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
                <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-xs font-semibold shrink-0">
                  {entry.profiles?.full_name?.charAt(0)}
                </div>
                <span className="flex-1 text-sm text-gray-700">{entry.profiles?.full_name ?? 'Unknown'}</span>
                <span className="text-xs text-gray-400">
                  {new Date(entry.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-400 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50 transition-all">
          {toast}
        </div>
      )}
    </div>
  )
}

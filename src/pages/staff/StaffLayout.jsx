import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Zap, LayoutDashboard, Users, ClipboardList, ScanLine, LogOut, ShieldCheck } from 'lucide-react'

const baseNav = [
  { to: '/staff',            label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/staff/members',    label: 'Members',   icon: Users },
  { to: '/staff/plans',      label: 'Plans',     icon: ClipboardList },
  { to: '/staff/attendance', label: 'Attendance',icon: ScanLine },
]

const adminNav = [
  { to: '/staff/team', label: 'Team', icon: ShieldCheck },
]

export default function StaffLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const nav = profile?.is_admin ? [...baseNav, ...adminNav] : baseNav

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-brand-400 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <span className="font-semibold text-gray-900">FitFlow</span>
            <span className="ml-2 badge badge-amber text-[10px]">{profile?.is_admin ? 'Admin' : 'Staff'}</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 text-xs font-semibold">
              {profile?.full_name?.charAt(0) ?? 'T'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name ?? 'Trainer'}</p>
              <p className="text-xs text-gray-400 truncate">{profile?.is_admin ? 'Admin' : 'Staff'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
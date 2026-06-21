import { Outlet, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Zap, LayoutDashboard, CalendarDays, Dumbbell, TrendingUp, CreditCard, LogOut, Settings, Lock } from 'lucide-react'

const nav = [
  { to: '/member',            label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/member/timetable',  label: 'Timetable',  icon: CalendarDays },
  { to: '/member/workout',    label: 'Workout',    icon: Dumbbell },
  { to: '/member/progress',   label: 'Progress',   icon: TrendingUp },
  { to: '/member/membership', label: 'Membership', icon: CreditCard },
  { to: '/member/settings',   label: 'Settings',   icon: Settings },
]

const GRACE_PERIOD_DAYS = 3

export default function MemberLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // Calculate lockout status
  let isLockedOut = false
  let daysOverdue = 0
  if (profile?.membership_expiry) {
    const daysSinceExpiry = Math.floor((new Date() - new Date(profile.membership_expiry)) / (1000 * 60 * 60 * 24))
    if (daysSinceExpiry > GRACE_PERIOD_DAYS) {
      isLockedOut = true
      daysOverdue = daysSinceExpiry
    }
  }

  const allowedWhenLocked = ['/member/membership', '/member/settings']
  const mustRedirect = isLockedOut && !allowedWhenLocked.includes(location.pathname)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-brand-400 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900">FitFlow</span>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, end }) => {
            const locked = isLockedOut && !allowedWhenLocked.includes(to)
            return (
              <NavLink
                key={to}
                to={locked ? '/member/membership' : to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    locked
                      ? 'text-gray-300 cursor-not-allowed'
                      : isActive
                        ? 'bg-brand-50 text-brand-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                {locked ? <Lock size={14} /> : <Icon size={16} />}
                {label}
              </NavLink>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-xs font-semibold">
              {profile?.full_name?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name ?? 'Member'}</p>
              <p className="text-xs text-gray-400 truncate">Member</p>
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
          {isLockedOut && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
              <Lock size={18} className="text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">Your membership expired {daysOverdue} days ago</p>
                <p className="text-xs text-red-500 mt-0.5">Renew now to regain access to your workouts and progress.</p>
              </div>
            </div>
          )}
          {mustRedirect ? <Navigate to="/member/membership" replace /> : <Outlet />}
        </div>
      </main>
    </div>
  )
}
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import LoginPage from './pages/LoginPage'
import PendingApprovalPage from './pages/PendingApprovalPage'
import SettingsPage from './pages/SettingsPage'
import MemberLayout from './pages/member/MemberLayout'
import MemberDashboard from './pages/member/MemberDashboard'
import MemberTimetable from './pages/member/MemberTimetable'
import MemberWorkout from './pages/member/MemberWorkout'
import MemberProgress from './pages/member/MemberProgress'
import MemberMembership from './pages/member/MemberMembership'

import StaffLayout from './pages/staff/StaffLayout'
import StaffDashboard from './pages/staff/StaffDashboard'
import StaffMembers from './pages/staff/StaffMembers'
import StaffPlans from './pages/staff/StaffPlans'
import StaffAttendance from './pages/staff/StaffAttendance'
import StaffTeam from './pages/staff/StaffTeam'

function AuthGate() {
  const { user, profile, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading FitFlow…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (role === 'staff') {
    if (profile?.staff_status === 'pending') return <Navigate to="/pending" replace />
    return <Navigate to="/staff" replace />
  }
  if (role === 'member') return <Navigate to="/member" replace />
  return <Navigate to="/login" replace />
}

function ProtectedRoute({ allowedRole, children }) {
  const { user, profile, role, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (allowedRole === 'staff' && role === 'staff' && profile?.staff_status === 'pending') {
    return <Navigate to="/pending" replace />
  }

  if (role !== allowedRole) return <Navigate to={role === 'staff' ? '/staff' : '/member'} replace />

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthGate />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pending" element={<PendingApprovalPage />} />

          {/* Member routes */}
          <Route path="/member" element={
            <ProtectedRoute allowedRole="member"><MemberLayout /></ProtectedRoute>
          }>
            <Route index element={<MemberDashboard />} />
            <Route path="timetable" element={<MemberTimetable />} />
            <Route path="workout" element={<MemberWorkout />} />
            <Route path="progress" element={<MemberProgress />} />
            <Route path="membership" element={<MemberMembership />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Staff routes */}
          <Route path="/staff" element={
            <ProtectedRoute allowedRole="staff"><StaffLayout /></ProtectedRoute>
          }>
            <Route index element={<StaffDashboard />} />
            <Route path="members" element={<StaffMembers />} />
            <Route path="plans" element={<StaffPlans />} />
            <Route path="attendance" element={<StaffAttendance />} />
            <Route path="team" element={<StaffTeam />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
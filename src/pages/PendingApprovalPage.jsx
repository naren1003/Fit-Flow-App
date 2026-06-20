import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Clock, Zap, LogOut } from 'lucide-react'

export default function PendingApprovalPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-brand-400 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-semibold text-gray-900">FitFlow</span>
        </div>

        <div className="card">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={26} className="text-amber-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Awaiting approval</h1>
          <p className="text-sm text-gray-500 mb-6">
            Your staff account has been created, but a gym admin needs to approve it before you can access the dashboard. You'll be able to sign in once approved.
          </p>
          <button onClick={handleSignOut} className="btn w-full justify-center py-2.5">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
import { useAuth } from '../../context/AuthContext'
import { CreditCard, Check } from 'lucide-react'

export default function MemberMembership() {
  const { profile } = useAuth()

  const expiryDate = profile?.membership_expiry
    ? new Date(profile.membership_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const isActive = profile?.membership_status === 'active'
  const isExpired = profile?.membership_status === 'expired'

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Membership</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Membership card */}
        <div className="flex flex-col gap-4">
          <div className="bg-brand-400 rounded-2xl p-6 text-white">
            <p className="text-xs opacity-75 mb-1">Membership plan</p>
            <p className="text-2xl font-semibold">{profile?.membership_plan ?? 'Standard'}</p>
            {expiryDate && (
              <p className="text-sm opacity-75 mt-1">Valid until {expiryDate}</p>
            )}
            <div className="mt-6 flex items-center justify-between">
              <div>
                <p className="text-xs opacity-60">Member</p>
                <p className="text-sm font-medium">{profile?.full_name}</p>
              </div>
              <CreditCard size={24} className="opacity-50" />
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Status</h2>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-700">Membership</span>
              {isActive
                ? <span className="badge badge-green">Active</span>
                : isExpired
                  ? <span className="badge badge-red">Expired</span>
                  : <span className="badge badge-gray">—</span>
              }
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-700">Plan</span>
              <span className="text-sm text-gray-500">{profile?.membership_plan ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Expires</span>
              <span className="text-sm text-gray-500">{expiryDate ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* Perks */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">What's included</h2>
          {[
            'Unlimited gym access',
            'Personalised workout plan',
            'Set-by-set workout logger',
            'Progress & strength tracking',
            'Trainer communication',
            'Attendance history',
          ].map(perk => (
            <div key={perk} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <div className="w-5 h-5 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                <Check size={11} className="text-brand-400" />
              </div>
              <span className="text-sm text-gray-700">{perk}</span>
            </div>
          ))}

          {isExpired && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">Your membership has expired.</p>
              <p className="text-xs text-red-500 mt-0.5">Contact the gym to renew.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

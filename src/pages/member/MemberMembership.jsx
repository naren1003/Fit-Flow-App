import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Check, CreditCard, Dumbbell, Zap } from 'lucide-react'

const MEMBERSHIP_PLANS = [
  { id: 'monthly', label: '1 Month', price: 3500, period: 'month', months: 1, badge: null },
  { id: 'quarterly', label: '3 Months', price: 6500, period: '3 months', months: 3, badge: 'Save 7%' },
  { id: 'halfyearly', label: '6 Months', price: 9999, period: '6 months', months: 6, badge: 'Save 19%' },
  { id: 'annual', label: '1 Year', price: 12999, period: 'year', months: 12, badge: 'Best value' },
]

const PT_PLANS = [
  { id: 'pt_3m', label: '3 Months PT', price: 20000, period: '3 months', sessions: 24, badge: 'Most popular' },
  { id: 'pt_6m', label: '6 Months PT', price: 35000, period: '6 months', sessions: 48, badge: 'Save 12%' },
  { id: 'pt_1y', label: '1 Year PT', price: 59999, period: 'year', sessions: 96, badge: 'Best deal' },
]

const MEMBERSHIP_FEATURES = [
  'Unlimited gym access',
  'Access to all equipment',
  'Locker room access',
  'Personalised workout plan',
  'Progress tracking',
]

const PT_FEATURES = [
  'Everything in membership',
  '2 PT sessions per week',
  'Customised nutrition advice',
  'Weekly check-ins with trainer',
  'Priority plan updates',
  'WhatsApp support',
]

export default function MemberMembership() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('membership') // 'membership' | 'pt'
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(null)

  const plans = tab === 'membership' ? MEMBERSHIP_PLANS : PT_PLANS
  const features = tab === 'membership' ? MEMBERSHIP_FEATURES : PT_FEATURES

  const expiryDate = profile?.membership_expiry
    ? new Date(profile.membership_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const isActive = profile?.membership_status === 'active'
  const isExpired = profile?.membership_status === 'expired'

  function handlePay() {
    if (!selectedPlan) return
    setPaying(true)

    // Razorpay integration
    // When you have API keys, replace the block below with real Razorpay checkout
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID ?? 'rzp_test_placeholder',
      amount: selectedPlan.price * 100, // paise
      currency: 'INR',
      name: 'FitFlow Gym',
      description: selectedPlan.label,
      prefill: {
        name: profile?.full_name ?? '',
        contact: profile?.phone ?? '',
      },
      theme: { color: '#1D9E75' },
      handler: function (response) {
        // Payment successful
        setPaid(selectedPlan)
        setPaying(false)
        // TODO: save payment to DB + update membership_expiry
      },
      modal: {
        ondismiss: () => setPaying(false),
      },
    }

    if (window.Razorpay) {
      const rzp = new window.Razorpay(options)
      rzp.open()
    } else {
      // Razorpay script not loaded — simulate for demo
      setTimeout(() => {
        setPaid(selectedPlan)
        setPaying(false)
      }, 1500)
    }
  }

  if (paid) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center">
        <Check size={32} className="text-brand-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Payment successful!</h2>
      <p className="text-gray-500">{paid.label} plan activated.</p>
      <p className="text-sm text-gray-400">Your trainer has been notified.</p>
      <button className="btn btn-primary" onClick={() => { setPaid(null); setSelectedPlan(null) }}>
        Done
      </button>
    </div>
  )

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Membership & Payments</h1>

      {/* Current membership card */}
      <div className="bg-brand-400 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs opacity-75 mb-1">Current plan</p>
            <p className="text-2xl font-semibold">{profile?.membership_plan ?? 'General Training'}</p>
            {expiryDate && <p className="text-sm opacity-75 mt-1">Valid until {expiryDate}</p>}
            {profile?.membership_expiry && (() => {
              const days = Math.ceil((new Date(profile.membership_expiry) - new Date()) / (1000 * 60 * 60 * 24))
              return days > 0
                ? <p className="text-sm mt-2 font-medium bg-white/15 rounded-lg px-3 py-1.5 inline-block">{days} day{days !== 1 ? 's' : ''} remaining</p>
                : <p className="text-sm mt-2 font-medium bg-red-400/30 rounded-lg px-3 py-1.5 inline-block">Expired {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} ago</p>
            })()}
            {!expiryDate && <p className="text-sm opacity-75 mt-1">No expiry set</p>}
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-white/20 text-white' : 'bg-red-400/30 text-white'}`}>
            {isActive ? 'Active' : isExpired ? 'Expired' : 'Inactive'}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs opacity-60">Member</p>
          <p className="text-sm font-medium">{profile?.full_name}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => { setTab('membership'); setSelectedPlan(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'membership' ? 'bg-brand-400 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <CreditCard size={15} /> General Training
        </button>
        <button
          onClick={() => { setTab('pt'); setSelectedPlan(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'pt' ? 'bg-brand-400 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <Dumbbell size={15} /> Personal Training
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Plans */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-700">
            {tab === 'membership' ? 'Choose a membership plan' : 'Choose a PT package'}
          </h2>
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedPlan?.id === plan.id
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{plan.label}</span>
                    {plan.badge && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${plan.badge === 'Best value' || plan.badge === 'Best deal'
                          ? 'bg-brand-50 text-brand-600'
                          : plan.badge === 'Most popular'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {plan.sessions ? `${plan.sessions} sessions · ` : ''}
                    {plan.period}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</p>
                  {plan.months > 1 && (
                    <p className="text-xs text-gray-400">
                      ₹{Math.round(plan.price / plan.months).toLocaleString('en-IN')}/mo
                    </p>
                  )}
                </div>
              </div>
              {selectedPlan?.id === plan.id && (
                <div className="mt-2 flex items-center gap-1 text-xs text-brand-600">
                  <Check size={12} /> Selected
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Summary + features */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {tab === 'membership' ? 'What\'s included' : 'PT package includes'}
            </h3>
            <ul className="flex flex-col gap-2">
              {features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-4 h-4 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                    <Check size={10} className="text-brand-600" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pay button */}
          <div className="card">
            {selectedPlan ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">{selectedPlan.label}</span>
                  <span className="text-sm font-semibold text-gray-900">₹{selectedPlan.price.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
                  <span className="text-sm text-gray-600">GST (18%)</span>
                  <span className="text-sm text-gray-600">₹{Math.round(selectedPlan.price * 0.18).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-semibold text-brand-600">
                    ₹{Math.round(selectedPlan.price * 1.18).toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  className="btn btn-primary w-full justify-center py-3"
                  onClick={handlePay}
                  disabled={paying}
                >
                  {paying
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><Zap size={15} /> Pay with Razorpay</>
                  }
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">Secured by Razorpay</p>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Select a plan to continue</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
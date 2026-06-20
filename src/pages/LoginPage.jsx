import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Zap, User, Dumbbell } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('signin') // 'signin' | 'signup'
  const [signupRole, setSignupRole] = useState('member') // 'member' | 'staff'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    } else {
      setTimeout(() => navigate('/'), 1500)
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: signupRole,
          staff_status: signupRole === 'staff' ? 'pending' : null,
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (signupRole === 'staff') {
      setSuccess('Account created! A gym admin needs to approve your staff access before you can sign in.')
    } else {
      setSuccess('Account created! You can now sign in with your email and password.')
    }
    setTab('signin')
    setPassword('')
    setConfirmPassword('')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-brand-400 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-semibold text-gray-900">FitFlow</span>
        </div>

        <div className="card">
          {/* Sign in / Sign up tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'signin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setTab('signin'); setError(''); setSuccess('') }}
            >
              Sign in
            </button>
            <button
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setTab('signup'); setError(''); setSuccess('') }}
            >
              Sign up
            </button>
          </div>

          {/* Sign in form */}
          {tab === 'signin' && (
            <>
              <h1 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h1>
              <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input className="input" type="password" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                {success && <p className="text-sm text-brand-600 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">{success}</p>}
                <button type="submit" className="btn btn-primary w-full justify-center py-2.5" disabled={loading}>
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Sign in'
                  }
                </button>
              </form>
            </>
          )}

          {/* Sign up form */}
          {tab === 'signup' && (
            <>
              <h1 className="text-lg font-semibold text-gray-900 mb-1">Create account</h1>
              <p className="text-sm text-gray-500 mb-4">Join your gym on FitFlow</p>

              {/* Role toggle */}
              <div className="flex gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => setSignupRole('member')}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${signupRole === 'member' ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <User size={18} className={signupRole === 'member' ? 'text-brand-600' : 'text-gray-400'} />
                  <span className={`text-xs font-medium ${signupRole === 'member' ? 'text-brand-600' : 'text-gray-500'}`}>Member</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignupRole('staff')}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${signupRole === 'staff' ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <Dumbbell size={18} className={signupRole === 'staff' ? 'text-brand-600' : 'text-gray-400'} />
                  <span className={`text-xs font-medium ${signupRole === 'staff' ? 'text-brand-600' : 'text-gray-500'}`}>Staff / Trainer</span>
                </button>
              </div>

              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                <div>
                  <label className="label">Full name</label>
                  <input className="input" type="text" placeholder="Arjun Mehta"
                    value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input className="input" type="password" placeholder="Min. 6 characters"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Confirm password</label>
                  <input className="input" type="password" placeholder="••••••••"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" className="btn btn-primary w-full justify-center py-2.5" disabled={loading}>
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Create account'
                  }
                </button>
              </form>
              <p className="text-xs text-gray-400 text-center mt-4">
                {signupRole === 'staff'
                  ? 'Staff accounts require admin approval before signing in.'
                  : 'Your trainer will assign your plan after you sign up.'}
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Contact your gym staff if you need help.
        </p>
      </div>
    </div>
  )
}
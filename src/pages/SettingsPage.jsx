import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Lock, Check, User } from 'lucide-react'

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setSaving(true)

    // Verify current password by re-authenticating
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      setError('Current password is incorrect.')
      setSaving(false)
      return
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSuccess('Password updated successfully!')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSaving(false)
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Settings</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Profile info */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-brand-400" />
            <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-semibold">
              {profile?.full_name?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            To update your name or contact details, ask your {profile?.role === 'staff' ? 'gym admin' : 'trainer'}.
          </p>
        </div>

        {/* Change password */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={16} className="text-brand-400" />
            <h2 className="text-sm font-semibold text-gray-900">Change password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div>
              <label className="label">Current password</label>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">New password</label>
              <input
                className="input"
                type="password"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-brand-600 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">{success}</p>}

            <button type="submit" className="btn btn-primary justify-center py-2.5" disabled={saving}>
              {saving
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Check size={15} /> Update password</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setError('')
    setLoading(true)
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.replace('/')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">New password</h1>
          <p className="mt-2 text-sm text-gray-500">Choose a strong password for your account</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="New password"
            minLength={8}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            placeholder="Confirm password"
            minLength={8}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}

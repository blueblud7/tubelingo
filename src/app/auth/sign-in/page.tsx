'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">TubeLingo</h1>
          <p className="mt-2 text-sm text-gray-500">Sign in to your account</p>
        </div>

        <Suspense>
          <SignInForm />
        </Suspense>

        <div className="mt-4 flex flex-col items-center gap-2 text-sm">
          <Link href="/auth/forgot-password" className="text-blue-500 hover:underline">
            Forgot password?
          </Link>
          <p className="text-gray-400">
            No account?{' '}
            <Link href="/auth/sign-up" className="font-medium text-blue-500 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

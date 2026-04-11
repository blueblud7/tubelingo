'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import Link from 'next/link'
import OfflineSaveButton from '@/components/ui/OfflineSaveButton'

interface Profile {
  id: string
  email?: string
  native_lang: string
  target_lang: string
  difficulty_pref: string
  plan: string
}

const LANG_LABELS: Record<string, string> = {
  en: 'English', ko: '한국어', ja: '日本語', es: 'Español', zh: '中文',
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/sign-in'); return }
      setEmail(user.email ?? null)

      const res = await fetch('/api/profile')
      if (res.ok) setProfile(await res.json())
      setLoading(false)
    }
    load()
  }, [router])

  const handleSignOut = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/auth/sign-in')
    router.refresh()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-40 text-gray-400">Loading...</div>
  }

  const planBadge = {
    free: { label: 'Free', color: 'bg-gray-100 text-gray-600' },
    pro: { label: 'Pro', color: 'bg-blue-100 text-blue-600' },
    team: { label: 'Team', color: 'bg-purple-100 text-purple-600' },
  }[profile?.plan ?? 'free'] ?? { label: 'Free', color: 'bg-gray-100 text-gray-600' }

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Account card */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-500">
            {email?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{email}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${planBadge.color}`}>
              {planBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Learning settings */}
      {profile && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Learning settings</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Native language</span>
              <span className="text-sm font-medium text-gray-900">{LANG_LABELS[profile.native_lang] ?? profile.native_lang}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Learning</span>
              <span className="text-sm font-medium text-gray-900">{LANG_LABELS[profile.target_lang] ?? profile.target_lang}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Difficulty</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{profile.difficulty_pref}</span>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="mt-4 block text-center text-sm text-blue-500 hover:underline"
          >
            Change settings
          </Link>
        </div>
      )}

      {/* Subscription */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Subscription</h2>
        {profile?.plan === 'free' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">You're on the Free plan.</p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>✗ 2 channels max</li>
              <li>✗ 20 lessons/month</li>
              <li>✗ 100 vocabulary words</li>
            </ul>
            <Link
              href="/subscribe"
              className="mt-2 block rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white"
            >
              Upgrade to Pro — $6.99/mo
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-900">
              {profile?.plan === 'pro' ? '⭐ Pro plan' : '👥 Team plan'} — Active
            </p>
            <button
              onClick={async () => {
                const res = await fetch('/api/stripe/portal', { method: 'POST' })
                const data = await res.json()
                if (data.url) window.location.href = data.url
              }}
              className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Manage subscription →
            </button>
          </div>
        )}
      </div>

      {/* Offline mode — Pro only */}
      {profile && <OfflineSaveButton plan={profile.plan} />}

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full rounded-xl border border-red-200 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
      >
        Sign out
      </button>
    </div>
  )
}

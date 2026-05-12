'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
]
const LANG_LABELS: Record<string, string> = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.label]))

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'mixed', label: 'Mixed' },
]

function ProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const checkoutSuccess = searchParams.get('checkout') === 'success'
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Pick<Profile, 'native_lang' | 'target_lang' | 'difficulty_pref'> | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/sign-in'); return }
      setEmail(user.email ?? null)

      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setDraft({ native_lang: data.native_lang, target_lang: data.target_lang, difficulty_pref: data.difficulty_pref })
      }
      setLoading(false)
    }
    load()
  }, [router])

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    if (res.ok) {
      const data = await res.json()
      setProfile((prev) => prev ? { ...prev, ...data } : data)
      setEditing(false)
    }
    setSaving(false)
  }

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

      {checkoutSuccess && (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-semibold text-green-700">Subscription activated!</p>
          <p className="text-xs text-green-600 mt-0.5">Welcome to Pro. All limits have been removed.</p>
        </div>
      )}

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
      {profile && draft && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Learning settings</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-sm text-blue-500">Edit</button>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => { setEditing(false); setDraft({ native_lang: profile.native_lang, target_lang: profile.target_lang, difficulty_pref: profile.difficulty_pref }) }} className="text-sm text-gray-400">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="text-sm font-medium text-blue-500 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            )}
          </div>

          {!editing ? (
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
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">Native language</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button key={lang.code} onClick={() => setDraft((d) => d ? { ...d, native_lang: lang.code } : d)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${draft.native_lang === lang.code ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">Learning</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.filter((l) => l.code !== draft.native_lang).map((lang) => (
                    <button key={lang.code} onClick={() => setDraft((d) => d ? { ...d, target_lang: lang.code } : d)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${draft.target_lang === lang.code ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">Difficulty</p>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button key={d.value} onClick={() => setDraft((prev) => prev ? { ...prev, difficulty_pref: d.value } : prev)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${draft.difficulty_pref === d.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  )
}

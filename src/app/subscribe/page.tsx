'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PLANS, PlanId } from '@/lib/stripe'

const FREE_FEATURES = [
  '2 channels',
  '20 lessons/month',
  '100 vocabulary words',
  'Basic quizzes',
]

export default function SubscribePage() {
  const router = useRouter()
  const [loading, setLoading] = useState<PlanId | null>(null)

  const handleSubscribe = async (planId: PlanId) => {
    setLoading(planId)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      alert(data.error ?? 'Something went wrong')
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="pt-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Upgrade TubeLingo</h1>
        <p className="mt-1 text-sm text-gray-500">Learn more, faster — with no limits</p>
      </div>

      {/* Free plan */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Free</h2>
          <span className="text-xl font-bold text-gray-900">$0</span>
        </div>
        <ul className="flex flex-col gap-2">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-gray-300">•</span> {f}
            </li>
          ))}
        </ul>
        <button
          onClick={() => router.push('/')}
          className="mt-4 w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-500"
        >
          Continue with Free
        </button>
      </div>

      {/* Pro plan */}
      <div className="rounded-2xl border-2 border-blue-400 bg-white p-5 shadow-md">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-900">Pro</h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">Most popular</span>
          </div>
          <span className="text-xl font-bold text-blue-600">$6.99<span className="text-sm font-normal text-gray-400">/mo</span></span>
        </div>
        <ul className="mb-4 flex flex-col gap-2">
          {PLANS.pro.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-blue-500">✓</span> {f}
            </li>
          ))}
        </ul>
        <button
          onClick={() => handleSubscribe('pro')}
          disabled={loading !== null}
          className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading === 'pro' ? 'Loading...' : 'Get Pro'}
        </button>
      </div>

      {/* Team plan */}
      <div className="rounded-2xl border-2 border-purple-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Team</h2>
          <span className="text-xl font-bold text-purple-600">$29.99<span className="text-sm font-normal text-gray-400">/mo</span></span>
        </div>
        <ul className="mb-4 flex flex-col gap-2">
          {PLANS.team.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-purple-500">✓</span> {f}
            </li>
          ))}
        </ul>
        <button
          onClick={() => handleSubscribe('team')}
          disabled={loading !== null}
          className="w-full rounded-xl bg-purple-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading === 'team' ? 'Loading...' : 'Get Team'}
        </button>
      </div>

      <p className="text-center text-xs text-gray-400">
        Cancel anytime · Secure payment via Stripe
      </p>
    </div>
  )
}

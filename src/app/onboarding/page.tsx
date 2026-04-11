'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
]

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner', desc: 'A1–A2 · Simple everyday words', emoji: '🌱' },
  { value: 'intermediate', label: 'Intermediate', desc: 'B1–B2 · Conversational', emoji: '🌿' },
  { value: 'advanced', label: 'Advanced', desc: 'C1–C2 · Complex expressions', emoji: '🌳' },
  { value: 'mixed', label: 'Mixed', desc: 'All levels · Let AI decide', emoji: '🎯' },
]

type Step = 'native' | 'target' | 'difficulty'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('native')
  const [nativeLang, setNativeLang] = useState('ko')
  const [targetLang, setTargetLang] = useState('en')
  const [difficulty, setDifficulty] = useState('mixed')
  const [saving, setSaving] = useState(false)

  const steps: Step[] = ['native', 'target', 'difficulty']
  const stepIndex = steps.indexOf(step)
  const progress = ((stepIndex + 1) / steps.length) * 100

  const handleFinish = async () => {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        native_lang: nativeLang,
        target_lang: targetLang,
        difficulty_pref: difficulty,
        onboarded: true,
      }),
    })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-12">
      {/* Progress */}
      <div className="mb-10">
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs text-gray-400">{stepIndex + 1} / {steps.length}</p>
      </div>

      {step === 'native' && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">What's your native language?</h2>
            <p className="mt-1 text-sm text-gray-500">We'll show translations in this language</p>
          </div>
          <div className="flex flex-col gap-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setNativeLang(lang.code)}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  nativeLang === lang.code
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="font-medium text-gray-900">{lang.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep('target')}
            className="mt-4 w-full rounded-xl bg-blue-500 py-3.5 text-sm font-semibold text-white"
          >
            Continue →
          </button>
        </div>
      )}

      {step === 'target' && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">What do you want to learn?</h2>
            <p className="mt-1 text-sm text-gray-500">Pick the language you're studying</p>
          </div>
          <div className="flex flex-col gap-3">
            {LANGUAGES.filter((l) => l.code !== nativeLang).map((lang) => (
              <button
                key={lang.code}
                onClick={() => setTargetLang(lang.code)}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  targetLang === lang.code
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="font-medium text-gray-900">{lang.label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('native')}
              className="flex-1 rounded-xl border border-gray-200 py-3.5 text-sm font-medium text-gray-600"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep('difficulty')}
              className="flex-1 rounded-xl bg-blue-500 py-3.5 text-sm font-semibold text-white"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 'difficulty' && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">What's your level?</h2>
            <p className="mt-1 text-sm text-gray-500">AI will adjust content difficulty for you</p>
          </div>
          <div className="flex flex-col gap-3">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
                  difficulty === opt.value
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className="font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('target')}
              className="flex-1 rounded-xl border border-gray-200 py-3.5 text-sm font-medium text-gray-600"
            >
              ← Back
            </button>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 rounded-xl bg-blue-500 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Setting up...' : "Let's go!"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

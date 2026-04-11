'use client'

import { useEffect, useState } from 'react'
import { saveOfflineLessons, getCacheMeta, clearOfflineCache } from '@/lib/offlineCache'

interface Props {
  plan: string
}

export default function OfflineSaveButton({ plan }: Props) {
  const [saving, setSaving] = useState(false)
  const [meta, setMeta] = useState<{ cachedAt: string; count: number } | null>(null)

  useEffect(() => {
    setMeta(getCacheMeta())
  }, [])

  if (plan === 'free') {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">Offline mode</h2>
        <p className="text-sm text-gray-500">Save lessons for offline use — Pro feature.</p>
        <a href="/subscribe" className="mt-3 block text-center text-sm font-medium text-blue-500 hover:underline">
          Upgrade to Pro →
        </a>
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await saveOfflineLessons()
      setMeta({ cachedAt: new Date().toISOString(), count: result.count })
    } catch {
      alert('Failed to save offline. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = () => {
    clearOfflineCache()
    setMeta(null)
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Offline mode</h2>
      {meta ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-green-600 font-medium">
            ✓ {meta.count} lessons saved offline
          </p>
          <p className="text-xs text-gray-400">
            Last saved: {new Date(meta.cachedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-blue-500 py-2.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update cache'}
            </button>
            <button
              onClick={handleClear}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-500"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">Save up to 50 recent lessons to use without internet.</p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-blue-500 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : '💾 Save for offline'}
          </button>
        </div>
      )}
    </div>
  )
}

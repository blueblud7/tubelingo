'use client'

import { useEffect, useRef, useState } from 'react'

interface Channel {
  id: string
  name: string
  youtube_id: string
  language: string
  category?: string
  subscriber_count?: number
  auto_generate: boolean
}

interface RecommendedChannel {
  name: string
  youtube_id: string
  language: string
  description: string
  is_popular: boolean
  subscriber_count: number
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [recommended, setRecommended] = useState<RecommendedChannel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subscribingId, setSubscribingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchAll = () => {
    fetch('/api/channels')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setChannels(data))
    fetch('/api/channels/recommended')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRecommended(data))
  }

  useEffect(() => { fetchAll() }, [])

  const subscribe = async (urlOrId?: string) => {
    const url = urlOrId ?? inputRef.current?.value.trim() ?? ''
    if (!url) return
    if (urlOrId) setSubscribingId(urlOrId)
    else setLoading(true)
    setError('')
    try {
      // If it looks like a channel ID (UC...), build the URL
      const channelUrl = url.startsWith('UC')
        ? `https://www.youtube.com/channel/${url}`
        : url
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: channelUrl }),
      })
      const data = await res.json()
      if (res.status === 403) throw new Error(data.error + '\n\n👉 /subscribe 에서 Pro로 업그레이드하세요.')
      if (!res.ok) throw new Error(data.error)
      setChannels((prev) => [data, ...prev])
      if (inputRef.current) inputRef.current.value = ''
      // Refresh recommendations after subscribing
      fetch('/api/channels/recommended')
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setRecommended(data))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
      setSubscribingId(null)
    }
  }

  const remove = async (id: string) => {
    await fetch(`/api/channels?id=${id}`, { method: 'DELETE' })
    setChannels((prev) => prev.filter((c) => c.id !== id))
    fetchAll()
  }

  const toggleAutoGenerate = async (id: string, current: boolean) => {
    const optimistic = !current
    setChannels((prev) => prev.map((c) => c.id === id ? { ...c, auto_generate: optimistic } : c))
    const res = await fetch(`/api/channels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_generate: optimistic }),
    })
    if (!res.ok) {
      // Revert on error
      setChannels((prev) => prev.map((c) => c.id === id ? { ...c, auto_generate: current } : c))
    }
  }

  const subscribedIds = new Set(channels.map((c) => c.youtube_id))

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Channels</h1>
        <p className="text-sm text-gray-500">Paste a YouTube channel URL to subscribe</p>
      </div>

      {/* Add channel */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            onKeyDown={(e) => e.key === 'Enter' && subscribe()}
            placeholder="https://youtube.com/@channelname"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
          />
          <button
            onClick={() => subscribe()}
            disabled={loading}
            className="rounded-xl bg-blue-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? '...' : 'Add'}
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Subscribed channel list */}
      {channels.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Subscribed
          </h2>
          <div className="flex flex-col gap-3">
            {channels.map((ch) => (
              <div key={ch.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-500">
                  {ch.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{ch.name}</p>
                  <p className="text-xs text-gray-400">{ch.language.toUpperCase()}</p>
                </div>
                {/* F-C04: Auto-generate toggle */}
                <button
                  onClick={() => toggleAutoGenerate(ch.id, ch.auto_generate ?? true)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    (ch.auto_generate ?? true)
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  title="Toggle auto lesson generation"
                >
                  {(ch.auto_generate ?? true) ? 'Auto ✓' : 'Auto off'}
                </button>
                <button
                  onClick={() => remove(ch.id)}
                  className="text-sm text-gray-400 hover:text-red-500 shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {recommended.length > 0 && (
        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Recommended
          </h2>
          <p className="mb-3 text-xs text-gray-400">Popular channels on TubeLingo</p>
          <div className="flex flex-col gap-3">
            {recommended.map((ch) => {
              const isAlreadySubscribed = subscribedIds.has(ch.youtube_id)
              const isSubscribing = subscribingId === ch.youtube_id
              return (
                <div key={ch.youtube_id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">
                    {ch.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-gray-900 truncate">{ch.name}</p>
                      {ch.is_popular && (
                        <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-600">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{ch.description}</p>
                    <p className="text-xs text-gray-300 mt-0.5">{ch.language.toUpperCase()}</p>
                  </div>
                  <button
                    onClick={() => !isAlreadySubscribed && subscribe(ch.youtube_id)}
                    disabled={isAlreadySubscribed || isSubscribing}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      isAlreadySubscribed
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isSubscribing ? '...' : isAlreadySubscribed ? 'Added' : 'Add'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {channels.length === 0 && recommended.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-400">No channels subscribed yet</p>
      )}
    </div>
  )
}

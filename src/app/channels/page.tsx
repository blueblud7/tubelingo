'use client'

import { useEffect, useRef, useState } from 'react'

interface Channel {
  id: string
  name: string
  youtube_id: string
  language: string
  category?: string
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/channels')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setChannels(data))
  }, [])

  const subscribe = async () => {
    const url = inputRef.current?.value.trim() ?? ''
    if (!url) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChannels((prev) => [data, ...prev])
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    await fetch(`/api/channels?id=${id}`, { method: 'DELETE' })
    setChannels((prev) => prev.filter((c) => c.id !== id))
  }

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
            onClick={subscribe}
            disabled={loading}
            className="rounded-xl bg-blue-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? '...' : 'Add'}
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Channel list */}
      <div className="flex flex-col gap-3">
        {channels.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">No channels subscribed yet</p>
        ) : (
          channels.map((ch) => (
            <div key={ch.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <img
                src={`https://img.youtube.com/vi//mqdefault.jpg`}
                alt=""
                className="h-10 w-10 rounded-full bg-gray-100 object-cover"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{ch.name}</p>
                <p className="text-xs text-gray-400">{ch.language.toUpperCase()}</p>
              </div>
              <button
                onClick={() => remove(ch.id)}
                className="text-sm text-gray-400 hover:text-red-500"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

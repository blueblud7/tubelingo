'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface VideoWithSentences {
  id: string
  youtube_video_id: string
  title: string
  published_at: string
  channel: { id: string; name: string; youtube_id: string; language: string } | null
  sentences: Array<{ id: string; text: string; difficulty: number }>
}

export default function HomePage() {
  const [lessons, setLessons] = useState<VideoWithSentences[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const fetchLessons = () =>
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLessons(data); return data })
      .finally(() => setLoading(false))

  useEffect(() => {
    fetchLessons()
  }, [])

  // Poll every 5s while processing
  useEffect(() => {
    if (!processing) return
    const interval = setInterval(() => {
      fetchLessons().then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProcessing(false)
        }
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [processing])

  return (
    <div className="flex flex-col gap-6 p-5">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">TubeLingo</h1>
        <p className="text-sm text-gray-500">Today's Lessons</p>
      </div>

      {/* Lessons */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : processing ? (
        <ProcessingState />
      ) : lessons.length === 0 ? (
        <EmptyState onStartProcessing={() => setProcessing(true)} />
      ) : (
        <div className="flex flex-col gap-3">
          {lessons.map((video) => (
            <LessonCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}

function LessonCard({ video }: { video: VideoWithSentences }) {
  const sentenceCount = video.sentences?.length ?? 0
  const thumbUrl = `https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Thumbnail */}
      <img src={thumbUrl} alt={video.title} className="h-40 w-full object-cover" />

      <div className="p-4">
        <p className="text-xs font-medium text-blue-500">{video.channel?.name}</p>
        <h2 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">{video.title}</h2>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">{sentenceCount} sentences</span>
          <div className="flex gap-2">
            <Link
              href={`/lesson/${video.id}`}
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white"
            >
              Study
            </Link>
            {sentenceCount > 0 && (
              <Link
                href={`/quiz/${video.id}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600"
              >
                Quiz
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onStartProcessing }: { onStartProcessing: () => void }) {
  const handleFetch = async () => {
    onStartProcessing()
    await fetch('/api/rss', { method: 'POST' })
  }

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <span className="text-5xl">📺</span>
      <h2 className="text-lg font-semibold text-gray-700">No lessons yet</h2>
      <p className="text-sm text-gray-400">
        Subscribe to a channel and lessons will be<br />generated automatically from new videos.
      </p>
      <div className="flex gap-3">
        <Link
          href="/channels"
          className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600"
        >
          Manage channels
        </Link>
        <button
          onClick={handleFetch}
          className="rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white"
        >
          Fetch lessons now
        </button>
      </div>
    </div>
  )
}

function ProcessingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
      <h2 className="text-lg font-semibold text-gray-700">Generating lessons...</h2>
      <p className="text-sm text-gray-400">
        Fetching transcripts and analyzing content.<br />This may take up to a minute.
      </p>
    </div>
  )
}

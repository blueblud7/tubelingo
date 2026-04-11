'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Sentence {
  id: string
  text: string
  difficulty: number
}

interface LessonEntry {
  id: string
  assigned_date: string
  status: 'pending' | 'in_progress' | 'completed'
  score: number | null
  completed_at: string | null
  video: {
    id: string
    youtube_video_id: string
    title: string
    channel: { id: string; name: string; youtube_id: string } | null
    sentences: Sentence[]
  } | null
}

interface Stats {
  streak: number
  longestStreak: number
  totalCompleted: number
  todayTotal: number
  todayDone: number
  calendar: { date: string; count: number; avgScore: number }[]
  reviewDue: number
}

export default function HomePage() {
  const [lessons, setLessons] = useState<LessonEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [progressMessages, setProgressMessages] = useState<{ message: string; step: string }[]>([])

  const fetchLessons = () =>
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) { setLessons(data); return data }
        return []
      })
      .finally(() => setLoading(false))

  const fetchStats = () =>
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => !data.error && setStats(data))

  useEffect(() => {
    fetchLessons()
    fetchStats()
  }, [])

  useEffect(() => {
    const handler = () => { setProcessing(false); fetchLessons(); fetchStats() }
    window.addEventListener('lessons:refresh', handler)
    return () => window.removeEventListener('lessons:refresh', handler)
  }, [])

  useEffect(() => {
    if (!processing) return
    const interval = setInterval(() => {
      fetchLessons().then((data) => {
        if (Array.isArray(data) && data.length > 0) setProcessing(false)
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [processing])

  // Group by date
  const grouped = lessons.reduce<Record<string, LessonEntry[]>>((acc, lesson) => {
    const date = lesson.assigned_date
    if (!acc[date]) acc[date] = []
    acc[date].push(lesson)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const today = new Date().toISOString().split('T')[0]

  const formatDate = (dateStr: string) => {
    if (dateStr === today) return 'Today'
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">TubeLingo</h1>
        <p className="text-sm text-gray-500">Your lessons</p>
      </div>

      {/* Stats */}
      {stats && <StatsBar stats={stats} />}

      {/* Quick Actions — F-H05 */}
      <QuickActions reviewDue={stats?.reviewDue ?? 0} hasLessons={lessons.length > 0} />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : processing ? (
        <ProcessingState messages={progressMessages} />
      ) : lessons.length === 0 ? (
        <EmptyState onStartProcessing={() => setProcessing(true)} onMessages={setProgressMessages} />
      ) : (
        <div className="flex flex-col gap-6">
          {sortedDates.map((date) => (
            <section key={date}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {formatDate(date)}
              </h2>
              <div className="flex flex-col gap-3">
                {grouped[date].map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Stats Bar ──────────────────────────────────────────────────────────────────

function StatsBar({ stats }: { stats: Stats }) {
  const { streak, totalCompleted, todayDone, todayTotal, calendar, longestStreak, reviewDue } = stats

  return (
    <div className="flex flex-col gap-3">
      {/* Top row: streak + total */}
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl bg-white py-4 shadow-sm">
          <span className="text-2xl font-bold text-gray-900">
            {streak > 0 ? '🔥' : '💤'} {streak}
          </span>
          <span className="text-xs text-gray-400">day streak</span>
          {longestStreak > streak && (
            <span className="text-xs text-gray-300">best {longestStreak}</span>
          )}
        </div>
        <Link href="/vocabulary" className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl bg-white py-4 shadow-sm relative">
          <span className="text-2xl font-bold text-gray-900">✅ {totalCompleted}</span>
          <span className="text-xs text-gray-400">lessons done</span>
          {reviewDue > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-xs font-bold text-white">
              {reviewDue}
            </span>
          )}
        </Link>
      </div>

      {/* Today progress */}
      {todayTotal > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Today's goal</span>
            <span className="text-sm font-semibold text-blue-500">
              {todayDone} / {todayTotal}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0}%` }}
            />
          </div>
          {todayDone === todayTotal && todayTotal > 0 && (
            <p className="mt-2 text-center text-xs font-medium text-green-500">
              All done for today! 🎉
            </p>
          )}
        </div>
      )}

      {/* Calendar heatmap */}
      <CalendarHeatmap calendar={calendar} />
    </div>
  )
}

// ── Calendar Heatmap ───────────────────────────────────────────────────────────

type CalendarDay = { date: string; count: number; avgScore: number }

function CalendarHeatmap({ calendar }: { calendar: CalendarDay[] }) {
  const today = new Date().toISOString().split('T')[0]

  // GitHub style: columns = weeks (left=old, right=new), rows = day of week (Sun→Sat)
  // Pad the start so column 0, row 0 = Sunday of the oldest week
  const firstDate = new Date(calendar[0].date)
  const firstDow = firstDate.getDay() // 0=Sun … 6=Sat

  const padded: (CalendarDay | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...calendar,
  ]
  // Split into week columns of 7
  const weeks: (CalendarDay | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) {
    const week = padded.slice(i, i + 7)
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  const cellColor = (day: CalendarDay) => {
    if (day.count === 0) return 'bg-gray-100'
    if (day.avgScore >= 80) return 'bg-blue-500'
    if (day.avgScore >= 50) return 'bg-blue-300'
    return 'bg-blue-200'
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Activity — last 10 weeks
      </p>
      <div className="overflow-x-auto">
        <div className="flex gap-1" style={{ minWidth: 'max-content' }}>
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-1 pr-1">
            {dayLabels.map((d, i) => (
              <div key={i} className="flex h-5 w-4 items-center text-xs text-gray-300">
                {i % 2 === 1 ? d : ''}
              </div>
            ))}
          </div>
          {/* Week columns */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) =>
                day ? (
                  <div
                    key={day.date}
                    title={`${day.date}${day.count > 0 ? ` · ${day.count} lesson${day.count > 1 ? 's' : ''}${day.avgScore > 0 ? ` · avg ${day.avgScore}%` : ''}` : ''}`}
                    className={`h-5 w-5 rounded-sm transition-all ${cellColor(day)} ${
                      day.date === today ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                    }`}
                  />
                ) : (
                  <div key={di} className="h-5 w-5" />
                )
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <span>Less</span>
        <div className="h-3 w-3 rounded-sm bg-gray-100" />
        <div className="h-3 w-3 rounded-sm bg-blue-200" />
        <div className="h-3 w-3 rounded-sm bg-blue-300" />
        <div className="h-3 w-3 rounded-sm bg-blue-500" />
        <span>More</span>
      </div>
    </div>
  )
}

// ── Lesson Card ────────────────────────────────────────────────────────────────

function LessonCard({ lesson }: { lesson: LessonEntry }) {
  const { video, status, score } = lesson
  if (!video) return null

  const sentenceCount = video.sentences?.length ?? 0
  const thumbUrl = `https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`

  const statusBadge = {
    pending: null,
    in_progress: <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">In progress</span>,
    completed: <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">✓ {score != null ? `${score}%` : 'Done'}</span>,
  }[status]

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <img src={thumbUrl} alt={video.title} className="h-36 w-full object-cover" />
      <div className="p-4">
        <p className="text-xs font-medium text-blue-500">{video.channel?.name}</p>
        <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-900">{video.title}</h2>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{sentenceCount} sentences</span>
            {statusBadge}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/lesson/${lesson.id}`}
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white"
            >
              {status === 'completed' ? 'Review' : 'Study'}
            </Link>
            {sentenceCount > 0 && (
              <Link
                href={`/quiz/${lesson.id}`}
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

// ── Quick Actions ──────────────────────────────────────────────────────────────

function QuickActions({ reviewDue, hasLessons }: { reviewDue: number; hasLessons: boolean }) {
  return (
    <div className="flex gap-3">
      <Link
        href="/channels"
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 shadow-sm"
      >
        <span>+</span> Add Channel
      </Link>
      {reviewDue > 0 ? (
        <Link
          href="/vocabulary"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-medium text-white shadow-sm"
        >
          📖 Review {reviewDue}
        </Link>
      ) : hasLessons ? (
        <Link
          href="/vocabulary"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 shadow-sm"
        >
          📖 Vocabulary
        </Link>
      ) : null}
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ onStartProcessing, onMessages }: {
  onStartProcessing: () => void
  onMessages: (msgs: { message: string; step: string }[]) => void
}) {
  const handleFetch = async () => {
    onStartProcessing()
    const res = await fetch('/api/rss', { method: 'POST' })
    if (!res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const msgs: { message: string; step: string }[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          msgs.push(data)
          onMessages([...msgs])
        } catch {}
      }
    }
    window.dispatchEvent(new Event('lessons:refresh'))
  }
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <span className="text-5xl">📺</span>
      <h2 className="text-lg font-semibold text-gray-700">No lessons yet</h2>
      <p className="text-sm text-gray-400">
        Subscribe to a channel and lessons will be<br />generated automatically from new videos.
      </p>
      <div className="flex gap-3">
        <Link href="/channels" className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600">
          Manage channels
        </Link>
        <button onClick={handleFetch} className="rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white">
          Fetch lessons now
        </button>
      </div>
    </div>
  )
}

// ── Processing State ───────────────────────────────────────────────────────────

const stepIcon: Record<string, string> = {
  checking: '📡',
  transcript: '📥',
  analyzing: '🤖',
  creating: '📝',
  ready: '✅',
  skipped: '⚠️',
  done: '🎉',
  error: '❌',
}

function ProcessingState({ messages }: { messages: { message: string; step: string }[] }) {
  const latest = messages[messages.length - 1]
  const isDone = latest?.step === 'done' || latest?.step === 'error'

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        {!isDone && <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />}
        <h2 className="font-semibold text-gray-800">
          {isDone ? 'Done!' : 'Generating lessons...'}
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="shrink-0">{stepIcon[msg.step] ?? '•'}</span>
            <span className={msg.step === 'error' ? 'text-red-500' : msg.step === 'skipped' ? 'text-gray-400' : 'text-gray-700'}>
              {msg.message}
            </span>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-gray-400">Starting...</p>
        )}
      </div>
    </div>
  )
}

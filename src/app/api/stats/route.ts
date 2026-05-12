import { NextResponse } from 'next/server'
import { createServiceClient, getCurrentUser } from '@/lib/supabase'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { data: lessons, error } = await db
    .from('lessons')
    .select('assigned_date, status, score, completed_at')
    .eq('status', 'completed')
    .eq('user_id', user.id)
    .order('assigned_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const completed = lessons ?? []

  // --- Streak calculation ---
  const completedDates = new Set(completed.map((l) => l.assigned_date))
  const today = new Date()
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (completedDates.has(dateStr)) {
      streak++
    } else {
      // Allow today to be incomplete (don't break streak if today not done yet)
      if (i === 0) continue
      break
    }
  }

  // Longest streak
  const allDates = [...completedDates].sort()
  let longest = 0
  let current = 0
  let prevDate: Date | null = null
  for (const dateStr of allDates) {
    const d = new Date(dateStr)
    if (prevDate) {
      const diff = (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      if (diff === 1) {
        current++
      } else {
        current = 1
      }
    } else {
      current = 1
    }
    if (current > longest) longest = current
    prevDate = d
  }

  // --- Calendar: last 70 days ---
  const calendarMap: Record<string, { count: number; totalScore: number }> = {}
  for (const l of completed) {
    const d = l.assigned_date
    if (!calendarMap[d]) calendarMap[d] = { count: 0, totalScore: 0 }
    calendarMap[d].count++
    calendarMap[d].totalScore += l.score ?? 0
  }

  const todayStr = today.toISOString().split('T')[0]
  const calendar: { date: string; count: number; avgScore: number }[] = []
  for (let i = 69; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const entry = calendarMap[dateStr]
    calendar.push({
      date: dateStr,
      count: entry?.count ?? 0,
      avgScore: entry ? Math.round(entry.totalScore / entry.count) : 0,
    })
  }

  // --- Today's progress ---
  const { data: todayLessons } = await db
    .from('lessons')
    .select('status')
    .eq('assigned_date', todayStr)
    .eq('user_id', user.id)

  const todayTotal = todayLessons?.length ?? 0
  const todayDone = todayLessons?.filter((l) => l.status === 'completed').length ?? 0

  // --- SM-2 review due count ---
  const { count: reviewDue } = await db
    .from('user_vocabulary')
    .select('*', { count: 'exact', head: true })
    .lte('next_review', todayStr)
    .eq('user_id', user.id)

  // --- Transcript success/failure stats (admin view) ---
  const { data: videoStats } = await db
    .from('videos')
    .select('transcript_error')

  const transcriptStats = { success: 0, disabled: 0, no_captions: 0, lang_missing: 0, blocked: 0, unavailable: 0, unknown: 0 }
  for (const v of videoStats ?? []) {
    if (!v.transcript_error) {
      transcriptStats.success++
    } else {
      const key = v.transcript_error as keyof typeof transcriptStats
      if (key in transcriptStats) transcriptStats[key]++
      else transcriptStats.unknown++
    }
  }
  const totalVideos = (videoStats ?? []).length
  const transcriptSuccessRate = totalVideos > 0
    ? Math.round((transcriptStats.success / totalVideos) * 100)
    : null

  return NextResponse.json({
    streak,
    longestStreak: longest,
    totalCompleted: completed.length,
    todayTotal,
    todayDone,
    calendar,
    reviewDue: reviewDue ?? 0,
    transcriptStats: { ...transcriptStats, total: totalVideos, successRate: transcriptSuccessRate },
  })
}

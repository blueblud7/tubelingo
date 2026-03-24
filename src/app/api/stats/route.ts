import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const db = createServiceClient()

  const { data: lessons, error } = await db
    .from('lessons')
    .select('assigned_date, status, score, completed_at')
    .eq('status', 'completed')
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

  const todayTotal = todayLessons?.length ?? 0
  const todayDone = todayLessons?.filter((l) => l.status === 'completed').length ?? 0

  return NextResponse.json({
    streak,
    longestStreak: longest,
    totalCompleted: completed.length,
    todayTotal,
    todayDone,
    calendar,
  })
}

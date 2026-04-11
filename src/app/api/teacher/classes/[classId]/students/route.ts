import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getCurrentUser } from '@/lib/supabase'

type RouteCtx = { params: Promise<{ classId: string }> }

// GET /api/teacher/classes/[classId]/students — list students with progress
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { classId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Verify teacher owns this class
  const { data: cls } = await db.from('classes').select('teacher_id').eq('id', classId).single()
  if (!cls || cls.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get members with profile + lesson stats
  const { data: members, error } = await db
    .from('class_members')
    .select(`
      joined_at,
      student:profiles(id, email, native_lang, target_lang)
    `)
    .eq('class_id', classId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type StudentRow = { id: string; email: string; native_lang: string; target_lang: string }

  // Fetch lesson stats per student
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studentIds = (members ?? []).map((m) => (m.student as unknown as StudentRow)?.id).filter(Boolean)

  const lessonStats: Record<string, { completed: number; streak: number; avgScore: number }> = {}
  if (studentIds.length > 0) {
    const { data: allLessons } = await db
      .from('lessons')
      .select('user_id, status, score, assigned_date')
      .in('user_id', studentIds)
      .eq('status', 'completed')

    for (const studentId of studentIds) {
      const studentLessons = (allLessons ?? []).filter((l) => l.user_id === studentId)
      const scores = studentLessons.map((l) => l.score ?? 0).filter((s) => s > 0)
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

      // Streak
      const dates = new Set(studentLessons.map((l) => l.assigned_date))
      let streak = 0
      const today = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const ds = d.toISOString().split('T')[0]
        if (dates.has(ds)) { streak++ } else if (i > 0) { break }
      }

      lessonStats[studentId] = { completed: studentLessons.length, streak, avgScore }
    }
  }

  const result = (members ?? []).map((m) => {
    const student = m.student as unknown as StudentRow | null
    return {
      student,
      joined_at: m.joined_at,
      stats: student ? (lessonStats[student.id] ?? { completed: 0, streak: 0, avgScore: 0 }) : null,
    }
  })

  return NextResponse.json(result)
}

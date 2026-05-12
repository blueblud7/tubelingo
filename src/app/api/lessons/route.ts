import { NextResponse } from 'next/server'
import { createServiceClient, getCurrentUser } from '@/lib/supabase'

// GET /api/lessons — lessons grouped by assigned_date
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { data, error } = await db
    .from('lessons')
    .select(`
      id,
      assigned_date,
      status,
      score,
      completed_at,
      video:videos(
        id,
        youtube_video_id,
        title,
        published_at,
        channel:channels(id, name, youtube_id, language),
        sentences(id, text, translation, timestamp, difficulty, vocabulary, idioms, grammar_points)
      )
    `)
    .eq('user_id', user.id)
    .order('assigned_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

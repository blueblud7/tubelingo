import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getCurrentUser } from '@/lib/supabase'

// GET /api/lessons/[id] — get a single lesson with sentences
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
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
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/lessons/[id] — update status and/or score
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const db = createServiceClient()

  const updates: Record<string, unknown> = {}
  if (body.status) updates.status = body.status
  if (body.score !== undefined) updates.score = body.score
  if (body.status === 'completed') updates.completed_at = new Date().toISOString()

  const { data, error } = await db
    .from('lessons')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

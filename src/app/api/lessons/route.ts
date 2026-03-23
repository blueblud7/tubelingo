import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/lessons — get today's lessons (from processed videos)
export async function GET(req: NextRequest) {
  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '5')

  // Get recently processed videos with their sentences
  const { data: videos, error } = await db
    .from('videos')
    .select(`
      id,
      youtube_video_id,
      title,
      published_at,
      channel:channels(id, name, youtube_id, language),
      sentences(id, text, translation, timestamp, difficulty, vocabulary, idioms, grammar_points)
    `)
    .eq('processed', true)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(videos ?? [])
}

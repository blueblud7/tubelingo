import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getCurrentUser } from '@/lib/supabase'
import { fetchTranscript, TranscriptFetchError } from '@/lib/transcript'
import { analyzeTranscript } from '@/lib/openai'
import { createLesson } from '@/lib/lesson'

// POST /api/analyze — manually trigger analysis for a video
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { video_id, native_language = 'ko', difficulty = 'mixed' } = await req.json()
  if (!video_id) return NextResponse.json({ error: 'video_id is required' }, { status: 400 })

  const db = createServiceClient()

  const { data: video, error } = await db
    .from('videos')
    .select('*, channel:channels(language)')
    .eq('id', video_id)
    .single()

  if (error || !video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  try {
    let transcript = video.transcript
    if (!transcript) {
      try {
        transcript = await fetchTranscript(video.youtube_video_id, video.channel?.language ?? 'en')
        await db.from('videos').update({ transcript, transcript_error: null, transcript_error_msg: null }).eq('id', video_id)
      } catch (err) {
        const errorType = err instanceof TranscriptFetchError ? err.errorType : 'unknown'
        const errorMsg = err instanceof Error ? err.message : String(err)
        await db.from('videos').update({ transcript_error: errorType, transcript_error_msg: errorMsg }).eq('id', video_id)
        throw err
      }
    }

    const sentences = await analyzeTranscript(
      transcript,
      video.channel?.language ?? 'en',
      native_language,
      difficulty
    )

    // Clear old sentences and insert new ones
    await db.from('sentences').delete().eq('video_id', video_id)
    await db.from('sentences').insert(
      sentences.map((s) => ({
        video_id,
        text: s.text,
        translation: s.translation,
        timestamp: s.timestamp,
        difficulty: s.difficulty,
        vocabulary: s.vocabulary,
        idioms: s.idioms,
        grammar_points: s.grammar_points,
      }))
    )

    await db.from('videos').update({ processed: true }).eq('id', video_id)
    await createLesson(video_id, user.id)

    return NextResponse.json({ success: true, sentences })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

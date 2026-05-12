import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { fetchChannelRSS } from '@/lib/rss'
import { fetchTranscript } from '@/lib/transcript'
import { analyzeTranscript } from '@/lib/openai'
import { createLesson } from '@/lib/lesson'

export const maxDuration = 300

// GET /api/cron/generate — Vercel cron: process all users' channels hourly
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()

  // Get all users with at least one active channel
  const { data: channels } = await db
    .from('channels')
    .select('id, youtube_id, name, language, user_id, auto_generate')
    .not('user_id', 'is', null)
    .eq('auto_generate', true)

  if (!channels || channels.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  // Group channels by user_id
  const byUser = channels.reduce<Record<string, typeof channels>>((acc, ch) => {
    const uid = ch.user_id as string
    if (!acc[uid]) acc[uid] = []
    acc[uid].push(ch)
    return acc
  }, {})

  let totalLessons = 0
  let totalErrors = 0

  for (const [userId, userChannels] of Object.entries(byUser)) {
    // Fetch user's profile settings
    const { data: profile } = await db
      .from('profiles')
      .select('native_lang, difficulty_pref')
      .eq('id', userId)
      .single()

    const nativeLang = profile?.native_lang ?? 'ko'
    const difficultyPref = (profile?.difficulty_pref ?? 'mixed') as 'beginner' | 'intermediate' | 'advanced' | 'mixed'

    for (const channel of userChannels) {
      try {
        const feed = await fetchChannelRSS(channel.youtube_id)
        const items = feed.items?.slice(0, 3) ?? []

        for (const item of items) {
          const videoId = item.id?.split(':').pop() || item.link?.split('v=')[1]?.split('&')[0]
          if (!videoId) continue

          // Skip already-processed videos
          const { data: existing } = await db
            .from('videos')
            .select('id, processed')
            .eq('youtube_video_id', videoId)
            .single()

          if (existing) {
            if (existing.processed) {
              await createLesson(existing.id, userId)
              totalLessons++
            }
            continue
          }

          const { data: video } = await db
            .from('videos')
            .insert({
              channel_id: channel.id,
              youtube_video_id: videoId,
              title: item.title ?? 'Untitled',
              published_at: item.pubDate,
              processed: false,
            })
            .select()
            .single()

          if (!video) continue

          try {
            const transcript = await fetchTranscript(videoId, channel.language)
            await db.from('videos').update({ transcript }).eq('id', video.id)

            const sentences = await analyzeTranscript(transcript, channel.language, nativeLang, difficultyPref)
            await db.from('sentences').insert(
              sentences.map((s) => ({
                video_id: video.id,
                text: s.text,
                translation: s.translation,
                timestamp: s.timestamp,
                difficulty: s.difficulty,
                vocabulary: s.vocabulary,
                idioms: s.idioms,
                grammar_points: s.grammar_points,
              }))
            )
            await db.from('videos').update({ processed: true }).eq('id', video.id)
            await createLesson(video.id, userId)
            totalLessons++
          } catch {
            totalErrors++
          }
        }
      } catch {
        totalErrors++
      }
    }
  }

  return NextResponse.json({ processed: totalLessons, errors: totalErrors, users: Object.keys(byUser).length })
}

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { fetchChannelRSS } from '@/lib/rss'
import { fetchTranscript } from '@/lib/transcript'
import { analyzeTranscript } from '@/lib/openai'

// POST /api/rss — poll all subscribed channels for new videos
// Called by cron job (e.g., Vercel cron or external scheduler)
export async function POST() {
  const db = createServiceClient()

  const { data: channels, error } = await db.from('channels').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = []

  for (const channel of channels ?? []) {
    try {
      const feed = await fetchChannelRSS(channel.youtube_id)
      const latestItems = feed.items?.slice(0, 5) ?? []

      for (const item of latestItems) {
        const videoId = item.id?.split(':').pop() || item.link?.split('v=')[1]?.split('&')[0]
        if (!videoId) continue

        // Skip already processed videos
        const { data: existing } = await db
          .from('videos')
          .select('id')
          .eq('youtube_video_id', videoId)
          .single()
        if (existing) continue

        // Save new video
        const { data: video, error: videoErr } = await db
          .from('videos')
          .insert({
            channel_id: channel.id,
            youtube_video_id: videoId,
            title: item.title,
            published_at: item.pubDate,
            processed: false,
          })
          .select()
          .single()

        if (videoErr || !video) continue

        // Extract transcript & analyze
        try {
          const transcript = await fetchTranscript(videoId, channel.language)

          await db.from('videos').update({ transcript }).eq('id', video.id)

          const sentences = await analyzeTranscript(
            transcript,
            channel.language,
            'ko', // TODO: per-user native language
            'mixed'
          )

          // Save sentences
          const sentenceRows = sentences.map((s) => ({
            video_id: video.id,
            text: s.text,
            translation: s.translation,
            timestamp: s.timestamp,
            difficulty: s.difficulty,
            vocabulary: s.vocabulary,
            idioms: s.idioms,
            grammar_points: s.grammar_points,
          }))

          await db.from('sentences').insert(sentenceRows)
          await db.from('videos').update({ processed: true }).eq('id', video.id)

          results.push({ videoId, status: 'processed' })
        } catch (err) {
          results.push({ videoId, status: 'transcript_failed', error: (err as Error).message })
        }
      }
    } catch (err) {
      results.push({ channelId: channel.id, status: 'rss_failed', error: (err as Error).message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

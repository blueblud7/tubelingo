import { createServiceClient } from '@/lib/supabase'
import { fetchChannelRSS } from '@/lib/rss'
import { fetchTranscript } from '@/lib/transcript'
import { analyzeTranscript } from '@/lib/openai'
import { createLesson } from '@/lib/lesson'

export const maxDuration = 60

// POST /api/rss — poll channels and stream progress via SSE
export async function POST() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (message: string, step: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message, step })}\n\n`))
      }

      try {
        const db = createServiceClient()
        const { data: channels, error } = await db.from('channels').select('*')
        if (error) throw error

        if (!channels || channels.length === 0) {
          send('No channels subscribed yet.', 'done')
          controller.close()
          return
        }

        // F-C04: only process channels with auto_generate enabled
        const activeChannels = channels.filter((c) => c.auto_generate !== false)
        const skippedCount = channels.length - activeChannels.length

        send(
          `Checking ${activeChannels.length} channel${activeChannels.length !== 1 ? 's' : ''}${skippedCount > 0 ? ` (${skippedCount} paused)` : ''} for updates...`,
          'checking'
        )

        for (const channel of activeChannels) {
          send(`Fetching feed: ${channel.name}`, 'checking')
          const feed = await fetchChannelRSS(channel.youtube_id)
          const latestItems = feed.items?.slice(0, 3) ?? []

          for (const item of latestItems) {
            const videoId = item.id?.split(':').pop() || item.link?.split('v=')[1]?.split('&')[0]
            if (!videoId) continue

            // Cache hit check
            const { data: existing } = await db
              .from('videos')
              .select('id, processed')
              .eq('youtube_video_id', videoId)
              .single()

            if (existing) {
              if (existing.processed) await createLesson(existing.id)
              continue
            }

            // Save video
            const { data: video } = await db
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

            if (!video) continue

            // Transcript
            try {
              send(`Downloading transcript: "${item.title?.slice(0, 50)}"`, 'transcript')
              const transcript = await fetchTranscript(videoId, channel.language)
              await db.from('videos').update({ transcript }).eq('id', video.id)

              // AI analysis
              send(`Analyzing content with AI...`, 'analyzing')
              const sentences = await analyzeTranscript(transcript, channel.language, 'en', 'mixed')
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

              send(`Creating lesson...`, 'creating')
              await createLesson(video.id)

              send(`Lesson ready: "${item.title?.slice(0, 50)}"`, 'ready')
            } catch (err) {
              send(`Skipped (no transcript): "${item.title?.slice(0, 40)}"`, 'skipped')
              console.error('Transcript error:', err)
            }
          }
        }

        send('All done!', 'done')
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ message: `Error: ${(err as Error).message}`, step: 'error' })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

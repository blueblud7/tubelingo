import { createServiceClient, getCurrentUser } from '@/lib/supabase'
import { fetchChannelRSS } from '@/lib/rss'
import { fetchTranscript, TranscriptFetchError } from '@/lib/transcript'
import { analyzeTranscript } from '@/lib/openai'
import { createLesson } from '@/lib/lesson'
import { checkMonthlyLessonLimit, FREE_LIMITS } from '@/lib/plans'

export const maxDuration = 60

// POST /api/rss — poll channels and stream progress via SSE
export async function POST() {
  const encoder = new TextEncoder()
  const user = await getCurrentUser()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (message: string, step: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message, step })}\n\n`))
      }

      try {
        const db = createServiceClient()

        // Fetch user profile settings
        let nativeLang = 'ko'
        let difficultyPref: 'beginner' | 'intermediate' | 'advanced' | 'mixed' = 'mixed'
        if (user) {
          const { data: profile } = await db.from('profiles').select('native_lang, difficulty_pref').eq('id', user.id).single()
          nativeLang = profile?.native_lang ?? 'ko'
          difficultyPref = (profile?.difficulty_pref ?? 'mixed') as typeof difficultyPref
        }

        // Free plan: check monthly lesson limit upfront
        if (user) {
          const limit = await checkMonthlyLessonLimit(user.id)
          if (!limit.allowed) {
            send(
              `Monthly limit reached (${limit.current}/${FREE_LIMITS.lessonsPerMonth} lessons). Upgrade to Pro for unlimited lessons.`,
              'error'
            )
            controller.close()
            return
          }
        }

        let query = db.from('channels').select('*')
        if (user) query = query.eq('user_id', user.id)
        const { data: channels, error } = await query
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

        let lessonsCreated = 0

        for (const channel of activeChannels) {
          // Re-check limit before each channel in case multiple videos get created
          if (user) {
            const limit = await checkMonthlyLessonLimit(user.id)
            if (!limit.allowed) {
              send(`Monthly limit reached (${limit.current}/${FREE_LIMITS.lessonsPerMonth}). Upgrade to Pro for more.`, 'skipped')
              break
            }
          }

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
              if (existing.processed) {
                await createLesson(existing.id, user?.id)
                lessonsCreated++
              }
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

              send(`Creating lesson...`, 'creating')
              await createLesson(video.id, user?.id)
              lessonsCreated++

              send(`Lesson ready: "${item.title?.slice(0, 50)}"`, 'ready')
            } catch (err) {
              const errorType = err instanceof TranscriptFetchError ? err.errorType : 'unknown'
              const errorMsg = err instanceof Error ? err.message : String(err)
              await db.from('videos').update({
                transcript_error: errorType,
                transcript_error_msg: errorMsg,
              }).eq('id', video.id)
              const label = errorType === 'disabled' ? 'captions disabled'
                : errorType === 'blocked' ? 'blocked by YouTube'
                : errorType === 'unavailable' ? 'video unavailable'
                : 'no transcript'
              send(`Skipped (${label}): "${item.title?.slice(0, 40)}"`, 'skipped')
              console.error('Transcript error:', errorType, errorMsg)
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

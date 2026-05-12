import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getCurrentUser } from '@/lib/supabase'
import { extractChannelId, buildRssUrl, fetchChannelRSS } from '@/lib/rss'
import { fetchTranscript } from '@/lib/transcript'
import { analyzeTranscript } from '@/lib/openai'
import { createLesson } from '@/lib/lesson'
import { checkChannelLimit, FREE_LIMITS } from '@/lib/plans'

// GET /api/channels — list channels for current user
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data, error } = await db
    .from('channels')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/channels — subscribe to a new channel
export async function POST(req: NextRequest) {
  const { url, language } = await req.json()
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  try {
    const channelId = await extractChannelId(url)
    const rssUrl = buildRssUrl(channelId)
    const feed = await fetchChannelRSS(channelId)

    const db = createServiceClient()
    const user = await getCurrentUser()

    // Free plan: max 2 channels
    if (user) {
      const limit = await checkChannelLimit(user.id)
      if (!limit.allowed) {
        return NextResponse.json(
          { error: `Free plan allows up to ${FREE_LIMITS.channels} channels. Upgrade to Pro for unlimited channels.`, code: 'CHANNEL_LIMIT' },
          { status: 403 }
        )
      }
    }

    // Upsert channel and increment subscriber_count
    const { data: existing } = await db.from('channels').select('subscriber_count').eq('youtube_id', channelId).single()
    const { data, error } = await db
      .from('channels')
      .upsert(
        {
          youtube_id: channelId,
          rss_url: rssUrl,
          name: feed.title || 'Unknown Channel',
          language: language ?? 'en',
          subscriber_count: (existing?.subscriber_count ?? 0) + 1,
          ...(user ? { user_id: user.id } : {}),
        },
        { onConflict: 'youtube_id' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fire-and-forget: process the latest video immediately
    let nativeLang = 'ko'
    let difficultyPref: 'beginner' | 'intermediate' | 'advanced' | 'mixed' = 'mixed'
    if (user) {
      const { data: profile } = await db.from('profiles').select('native_lang, difficulty_pref').eq('id', user.id).single()
      nativeLang = profile?.native_lang ?? 'ko'
      difficultyPref = (profile?.difficulty_pref ?? 'mixed') as typeof difficultyPref
    }
    processLatestVideo(data.id, channelId, data.language ?? 'en', feed, user?.id, nativeLang, difficultyPref).catch(() => {})

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}

async function processLatestVideo(
  channelDbId: string,
  channelId: string,
  language: string,
  feed: Awaited<ReturnType<typeof fetchChannelRSS>>,
  userId?: string,
  nativeLang = 'ko',
  difficultyPref: 'beginner' | 'intermediate' | 'advanced' | 'mixed' = 'mixed'
) {
  const db = createServiceClient()
  const item = feed.items?.[0]
  if (!item) return

  const videoId = item.id?.split(':').pop() || item.link?.split('v=')[1]?.split('&')[0]
  if (!videoId) return

  // If already processed, just create a lesson record (cache hit — skip expensive work)
  const { data: existing } = await db
    .from('videos')
    .select('id, processed')
    .eq('youtube_video_id', videoId)
    .single()
  if (existing) {
    if (existing.processed) await createLesson(existing.id, userId)
    return
  }

  const { data: video } = await db
    .from('videos')
    .insert({
      channel_id: channelDbId,
      youtube_video_id: videoId,
      title: item.title ?? 'Untitled',
      published_at: item.pubDate,
      processed: false,
    })
    .select()
    .single()

  if (!video) return

  const transcript = await fetchTranscript(videoId, language)
  await db.from('videos').update({ transcript }).eq('id', video.id)

  const sentences = await analyzeTranscript(transcript, language, nativeLang, difficultyPref)
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
}

// DELETE /api/channels?id=...
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const db = createServiceClient()
  const { error } = await db.from('channels').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

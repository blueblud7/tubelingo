import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { extractChannelId, buildRssUrl, fetchChannelRSS } from '@/lib/rss'
import { fetchTranscript } from '@/lib/transcript'
import { analyzeTranscript } from '@/lib/openai'

// GET /api/channels — list all channels
export async function GET() {
  const db = createServiceClient()
  const { data, error } = await db.from('channels').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/channels — subscribe to a new channel
export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  try {
    const channelId = await extractChannelId(url)
    const rssUrl = buildRssUrl(channelId)
    const feed = await fetchChannelRSS(channelId)

    const db = createServiceClient()

    // Upsert channel
    const { data, error } = await db
      .from('channels')
      .upsert(
        {
          youtube_id: channelId,
          rss_url: rssUrl,
          name: feed.title || 'Unknown Channel',
          language: 'en', // TODO: auto-detect from feed
        },
        { onConflict: 'youtube_id' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fire-and-forget: process the latest video immediately
    processLatestVideo(data.id, channelId, data.language ?? 'en', feed).catch(() => {})

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}

async function processLatestVideo(
  channelDbId: string,
  channelId: string,
  language: string,
  feed: Awaited<ReturnType<typeof fetchChannelRSS>>
) {
  const db = createServiceClient()
  const item = feed.items?.[0]
  if (!item) return

  const videoId = item.id?.split(':').pop() || item.link?.split('v=')[1]?.split('&')[0]
  if (!videoId) return

  // Skip if already processed
  const { data: existing } = await db
    .from('videos')
    .select('id')
    .eq('youtube_video_id', videoId)
    .single()
  if (existing) return

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

  const sentences = await analyzeTranscript(transcript, language, 'en', 'mixed')
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
}

// DELETE /api/channels?id=...
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const db = createServiceClient()
  const { error } = await db.from('channels').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

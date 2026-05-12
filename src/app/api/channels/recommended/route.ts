import { NextResponse } from 'next/server'
import { createServiceClient, getCurrentUser } from '@/lib/supabase'

// Curated popular language learning channels
const CURATED: { name: string; youtube_id: string; language: string; description: string }[] = [
  { name: 'BBC Learning English', youtube_id: 'UCHaHD477h-FeBbVh9Sh7syA', language: 'en', description: 'Official BBC English learning channel' },
  { name: 'EnglishClass101', youtube_id: 'UCQZmQa7YeUOcEK4ELGQTK_g', language: 'en', description: 'Structured English lessons for all levels' },
  { name: 'Speak English With Vanessa', youtube_id: 'UCxJGMJbjokfnr2-s4_RXosg', language: 'en', description: 'Natural English with an American teacher' },
  { name: 'Learn English with TV Series', youtube_id: 'UCKgpamMlm872zkGDcBJHYDg', language: 'en', description: 'English through Netflix & TV clips' },
  { name: 'JapanesePod101', youtube_id: 'UCnubig3Jb1G35e-19E5GhDQ', language: 'ja', description: 'Japanese lessons from beginner to advanced' },
  { name: 'Comprehensible Japanese', youtube_id: 'UCXo8kuPsW9CWqnknUMcj0qQ', language: 'ja', description: 'Input-based Japanese immersion' },
  { name: 'SpanishPod101', youtube_id: 'UCsdKECs3aM4g3mWE_kbUOKg', language: 'es', description: 'Structured Spanish lessons' },
  { name: 'Dreaming Spanish', youtube_id: 'UCxvt-g7JsPNnEn6neh3K7wA', language: 'es', description: 'Comprehensible input in Spanish' },
  { name: 'FrenchPod101', youtube_id: 'UCFoKDzTLdAHpmNGd3kQrJZA', language: 'fr', description: 'French for all levels' },
  { name: 'Deutsch für Euch', youtube_id: 'UCk37X4ePFLjwgXGsCDaW2nQ', language: 'de', description: 'German grammar and vocabulary explained' },
  { name: 'ChinesePod', youtube_id: 'UCpJoUTQ8N5hqyJRNGJ3K0-Q', language: 'zh', description: 'Mandarin Chinese lessons' },
  { name: 'KoreanClass101', youtube_id: 'UCh3OAFCGbdnFmB6oZRCPd_g', language: 'ko', description: 'Korean from scratch' },
]

// GET /api/channels/recommended — return popular channels not yet subscribed
export async function GET() {
  const user = await getCurrentUser()
  const db = createServiceClient()

  // Get current user's subscribed channel IDs (user-specific)
  let subscribedQuery = db.from('channels').select('youtube_id, language, subscriber_count')
  if (user) subscribedQuery = subscribedQuery.eq('user_id', user.id)
  const { data: subscribed } = await subscribedQuery
  const subscribedIds = new Set((subscribed ?? []).map((c) => c.youtube_id))

  // Get languages the user is already learning (to prioritize relevant recommendations)
  const userLanguages = new Set((subscribed ?? []).map((c) => c.language))

  // Build curated recommendations not yet subscribed
  const curated = CURATED
    .filter((c) => !subscribedIds.has(c.youtube_id))
    .map((c) => ({ ...c, is_popular: false, subscriber_count: 0 }))
    // Prioritize channels matching user's languages
    .sort((a, b) => {
      const aMatch = userLanguages.has(a.language) ? 1 : 0
      const bMatch = userLanguages.has(b.language) ? 1 : 0
      return bMatch - aMatch
    })

  // Also return popular DB channels (subscriber_count > 0) not already subscribed
  const { data: popularInDb } = await db
    .from('channels')
    .select('name, youtube_id, language, subscriber_count')
    .gt('subscriber_count', 1)
    .order('subscriber_count', { ascending: false })
    .limit(10)

  const popularNotSubscribed = (popularInDb ?? [])
    .filter((c) => !subscribedIds.has(c.youtube_id))
    .map((c) => ({ ...c, description: `${c.subscriber_count} subscribers on TubeLingo`, is_popular: true }))

  // Merge: DB popular first, then curated, deduplicate
  const seen = new Set<string>()
  const result = [...popularNotSubscribed, ...curated].filter((c) => {
    if (seen.has(c.youtube_id)) return false
    seen.add(c.youtube_id)
    return true
  })

  return NextResponse.json(result.slice(0, 12))
}

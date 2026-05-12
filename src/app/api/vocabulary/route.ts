import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getCurrentUser } from '@/lib/supabase'
import { checkVocabularyLimit, FREE_LIMITS } from '@/lib/plans'

// GET /api/vocabulary — list saved words for current user
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data, error } = await db
    .from('user_vocabulary')
    .select('*')
    .eq('user_id', user.id)
    .order('next_review', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/vocabulary — save a word
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { word, definition, part_of_speech, pronunciation, source_sentence, source_video_id } = body
  if (!word || !definition) return NextResponse.json({ error: 'word and definition required' }, { status: 400 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Free plan: max 100 words
  {
    const limit = await checkVocabularyLimit(user.id)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Free plan allows up to ${FREE_LIMITS.vocabulary} saved words. Upgrade to Pro for unlimited vocabulary.`, code: 'VOCAB_LIMIT' },
        { status: 403 }
      )
    }
  }

  const db = createServiceClient()
  const { data, error } = await db
    .from('user_vocabulary')
    .upsert(
      {
        word,
        definition,
        part_of_speech,
        pronunciation,
        source_sentence,
        source_video_id,
        user_id: user.id,
      },
      { onConflict: 'word,user_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

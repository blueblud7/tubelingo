import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getCurrentUser } from '@/lib/supabase'

// SM-2 spaced repetition algorithm
// quality: 0-5 (0=blackout, 3=hard, 5=perfect)
function sm2(quality: number, easiness: number, interval: number, reps: number) {
  let newEasiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (newEasiness < 1.3) newEasiness = 1.3

  let newReps = reps
  let newInterval = interval

  if (quality >= 3) {
    if (reps === 0) newInterval = 1
    else if (reps === 1) newInterval = 6
    else newInterval = Math.round(interval * easiness)
    newReps = reps + 1
  } else {
    newReps = 0
    newInterval = 1
  }

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + newInterval)

  return {
    easiness_factor: newEasiness,
    interval_days: newInterval,
    repetitions: newReps,
    next_review: nextReview.toISOString().split('T')[0],
  }
}

// PATCH /api/vocabulary/[id] — update SM-2 after review
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { quality } = await req.json() // quality: 0-5

  const db = createServiceClient()
  const { data: vocab, error: fetchErr } = await db
    .from('user_vocabulary')
    .select('easiness_factor, interval_days, repetitions, user_id')
    .eq('id', id)
    .single()

  if (fetchErr || !vocab) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (vocab.user_id && vocab.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates = sm2(quality, vocab.easiness_factor, vocab.interval_days, vocab.repetitions)
  const { data, error } = await db.from('user_vocabulary').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/vocabulary/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createServiceClient()
  const { error } = await db.from('user_vocabulary').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

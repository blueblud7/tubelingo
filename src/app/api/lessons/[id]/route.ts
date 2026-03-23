import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// PATCH /api/lessons/[id] — update status and/or score
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const db = createServiceClient()

  const updates: Record<string, unknown> = {}
  if (body.status) updates.status = body.status
  if (body.score !== undefined) updates.score = body.score
  if (body.status === 'completed') updates.completed_at = new Date().toISOString()

  const { data, error } = await db
    .from('lessons')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

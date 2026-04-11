import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getCurrentUser } from '@/lib/supabase'

type RouteCtx = { params: Promise<{ classId: string }> }

// POST /api/teacher/classes/[classId]/channels — assign a channel to a class
export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { classId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { channelId } = await req.json()
  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })

  const db = createServiceClient()
  const { data: cls } = await db.from('classes').select('teacher_id').eq('id', classId).single()
  if (!cls || cls.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await db
    .from('class_channels')
    .upsert({ class_id: classId, channel_id: channelId }, { onConflict: 'class_id,channel_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/teacher/classes/[classId]/channels?channelId=... — remove channel from class
export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  const { classId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const channelId = req.nextUrl.searchParams.get('channelId')
  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })

  const db = createServiceClient()
  const { data: cls } = await db.from('classes').select('teacher_id').eq('id', classId).single()
  if (!cls || cls.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.from('class_channels').delete().eq('class_id', classId).eq('channel_id', channelId)
  return NextResponse.json({ success: true })
}

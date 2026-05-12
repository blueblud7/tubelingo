import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient, getCurrentUser } from '@/lib/supabase'

async function requireTeacher() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createSessionClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()
  if (profile?.plan !== 'team') return null
  return user
}

// GET /api/teacher/classes — list teacher's classes with member counts
export async function GET() {
  const user = await requireTeacher()
  if (!user) return NextResponse.json({ error: 'Team plan required' }, { status: 403 })

  const supabase = await createSessionClient()
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      class_members(count),
      class_channels(
        channel:channels(id, name, youtube_id)
      )
    `)
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/teacher/classes?classId=... — delete a class
export async function DELETE(req: NextRequest) {
  const user = await requireTeacher()
  if (!user) return NextResponse.json({ error: 'Team plan required' }, { status: 403 })

  const classId = req.nextUrl.searchParams.get('classId')
  if (!classId) return NextResponse.json({ error: 'classId required' }, { status: 400 })

  const supabase = await createSessionClient()
  const { error } = await supabase.from('classes').delete().eq('id', classId).eq('teacher_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// POST /api/teacher/classes — create a new class
export async function POST(req: NextRequest) {
  const user = await requireTeacher()
  if (!user) return NextResponse.json({ error: 'Team plan required' }, { status: 403 })

  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const supabase = await createSessionClient()
  const { data, error } = await supabase
    .from('classes')
    .insert({ teacher_id: user.id, name, description })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

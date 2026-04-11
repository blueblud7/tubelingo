import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getCurrentUser } from '@/lib/supabase'

// POST /api/teacher/invite — student joins a class via invite code
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteCode } = await req.json()
  if (!inviteCode) return NextResponse.json({ error: 'inviteCode required' }, { status: 400 })

  const db = createServiceClient()

  // Look up class by invite code
  const { data: cls, error: clsError } = await db
    .from('classes')
    .select('id, name')
    .eq('invite_code', inviteCode.trim().toLowerCase())
    .single()

  if (clsError || !cls) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  // Add student to class (ignore duplicate)
  const { error } = await db
    .from('class_members')
    .upsert({ class_id: cls.id, student_id: user.id }, { onConflict: 'class_id,student_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, className: cls.name })
}

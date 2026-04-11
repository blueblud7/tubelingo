import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/supabase'

// GET /api/profile — get current user's profile
export async function GET() {
  const supabase = await createSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/profile — update profile fields
export async function PATCH(req: NextRequest) {
  const supabase = await createSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed: Record<string, unknown> = {}
  if (body.native_lang) allowed.native_lang = body.native_lang
  if (body.target_lang) allowed.target_lang = body.target_lang
  if (body.difficulty_pref) allowed.difficulty_pref = body.difficulty_pref
  if (typeof body.onboarded === 'boolean') allowed.onboarded = body.onboarded

  const { data, error } = await supabase
    .from('profiles')
    .update(allowed)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

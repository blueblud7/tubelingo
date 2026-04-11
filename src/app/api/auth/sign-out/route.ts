import { NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/supabase'

export async function POST() {
  const supabase = await createSessionClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/auth/sign-in', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
}

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// ── Browser client (client components) ───────────────────────────────────────
export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Server client with session (server components & API routes) ───────────────
export async function createSessionClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// ── Service role client (privileged API routes — bypasses RLS) ────────────────
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Get current user from session (server-side) ───────────────────────────────
export async function getCurrentUser() {
  const supabase = await createSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

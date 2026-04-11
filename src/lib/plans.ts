import { createServiceClient } from '@/lib/supabase'

export const FREE_LIMITS = {
  channels: 2,
  lessonsPerMonth: 20,
  vocabulary: 100,
} as const

export type Plan = 'free' | 'pro' | 'team'

interface LimitResult {
  allowed: boolean
  current: number
  limit: number
  plan: Plan
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const db = createServiceClient()
  const { data } = await db.from('profiles').select('plan').eq('id', userId).single()
  return (data?.plan ?? 'free') as Plan
}

export async function checkChannelLimit(userId: string): Promise<LimitResult> {
  const plan = await getUserPlan(userId)
  if (plan !== 'free') return { allowed: true, current: 0, limit: Infinity, plan }

  const db = createServiceClient()
  const { count } = await db
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const current = count ?? 0
  return { allowed: current < FREE_LIMITS.channels, current, limit: FREE_LIMITS.channels, plan }
}

export async function checkVocabularyLimit(userId: string): Promise<LimitResult> {
  const plan = await getUserPlan(userId)
  if (plan !== 'free') return { allowed: true, current: 0, limit: Infinity, plan }

  const db = createServiceClient()
  const { count } = await db
    .from('user_vocabulary')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const current = count ?? 0
  return { allowed: current < FREE_LIMITS.vocabulary, current, limit: FREE_LIMITS.vocabulary, plan }
}

export async function checkMonthlyLessonLimit(userId: string): Promise<LimitResult> {
  const plan = await getUserPlan(userId)
  if (plan !== 'free') return { allowed: true, current: 0, limit: Infinity, plan }

  const db = createServiceClient()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await db
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString())

  const current = count ?? 0
  return { allowed: current < FREE_LIMITS.lessonsPerMonth, current, limit: FREE_LIMITS.lessonsPerMonth, plan }
}

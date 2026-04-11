import { NextRequest, NextResponse } from 'next/server'
import { stripe, PLANS, PlanId } from '@/lib/stripe'
import { getCurrentUser, createServiceClient } from '@/lib/supabase'

// POST /api/stripe/checkout — create checkout session
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId } = await req.json() as { planId: PlanId }
  const plan = PLANS[planId]
  if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const db = createServiceClient()
  const { data: profile } = await db
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : user.email,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${origin}/profile?checkout=success`,
    cancel_url: `${origin}/subscribe`,
    metadata: { user_id: user.id, plan_id: planId },
  })

  return NextResponse.json({ url: session.url })
}

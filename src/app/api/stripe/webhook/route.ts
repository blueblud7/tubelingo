import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'
import Stripe from 'stripe'

export const config = { api: { bodyParser: false } }

// POST /api/stripe/webhook — handle Stripe events
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const planId = session.metadata?.plan_id
      if (!userId || !planId) break

      await db.from('profiles').update({
        plan: planId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      }).eq('id', userId)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const status = sub.status

      if (status === 'active') {
        // Find plan from price ID
        const priceId = sub.items.data[0]?.price.id
        const { data: profile } = await db
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()
        if (profile) {
          const planId = priceId === process.env.STRIPE_PRO_PRICE_ID ? 'pro'
            : priceId === process.env.STRIPE_TEAM_PRICE_ID ? 'team'
            : 'free'
          await db.from('profiles').update({ plan: planId }).eq('id', profile.id)
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      await db.from('profiles')
        .update({ plan: 'free', stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}

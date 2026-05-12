import Stripe from 'stripe'

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const PLANS = {
  pro: {
    name: 'Pro',
    price: '$6.99/mo',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: [
      'Unlimited channels',
      'Unlimited lessons',
      'Unlimited vocabulary',
      'Pronunciation practice',
      'Offline mode',
    ],
  },
  team: {
    name: 'Team',
    price: '$29.99/mo',
    priceId: process.env.STRIPE_TEAM_PRICE_ID!,
    features: [
      'Everything in Pro',
      'Teacher dashboard',
      'Student progress tracking',
      'Custom channel distribution',
      'Up to 30 students',
    ],
  },
} as const

export type PlanId = keyof typeof PLANS

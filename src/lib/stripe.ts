import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
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

import { getCurrentUser } from '@/lib/supabase'
import Dashboard from '@/components/Dashboard'
import LandingPage from '@/components/LandingPage'

export default async function Page() {
  const user = await getCurrentUser()
  if (user) return <Dashboard />
  return <LandingPage />
}

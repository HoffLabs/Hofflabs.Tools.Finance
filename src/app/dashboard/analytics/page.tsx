import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth/utils'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    redirect('/auth/login')
  }

  return <AnalyticsClient />
}

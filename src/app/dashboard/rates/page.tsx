import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth/utils'
import RatesClient from './RatesClient'

export default async function RatesPage() {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    redirect('/auth/login')
  }

  return <RatesClient />
}

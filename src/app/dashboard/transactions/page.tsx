import { getCurrentUserId } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Client component for transactions
import ModernTransactionsClient from './ModernTransactionsClient'

export default async function TransactionsPage() {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    redirect('/auth/login')
  }
  
  return <ModernTransactionsClient userId={userId} />
}
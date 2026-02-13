import { getCurrentUserId } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Client component for transactions
import TransactionsClient from './TransactionsClient'

export default async function TransactionsPage() {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    redirect('/auth/login')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">All Transactions</h1>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Dashboard
            </Link>
          </div>
          
          {/* Client component that will fetch and display all transactions */}
          <TransactionsClient userId={userId} />
        </div>
      </div>
    </div>
  )
}
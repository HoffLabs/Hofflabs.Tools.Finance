import { getCurrentUserId } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import PlaidLinkButton from '../components/PlaidLinkButton'

// Client components for interactive functionality
import DashboardClient from './DashboardClient'

export default async function DashboardPage({ searchParams }: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    redirect('/auth/login')
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row gap-8 py-8">
        {/* Main content */}
        <div className="flex-1">
          {/* Client component that will fetch and display data */}
          <DashboardClient userId={userId} />
        </div>
        
        {/* Sidebar */}
        {/* <div className="w-full md:w-80">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Connect Bank Account</h2>
            <p className="text-gray-600 mb-4">Securely connect your bank account to start tracking your finances.</p>
            <PlaidLinkButton />
          </div>
        </div> */}
      </div>
    </div>
  )
}
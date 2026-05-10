import { getCurrentUserId } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import PlaidLinkButton from '../components/PlaidLinkButton'

// Client components for interactive functionality
import DashboardClient from './DashboardClient'

export default async function DashboardPage({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const userId = await getCurrentUserId()
  
  if (!userId) {
    redirect('/auth/login')
  }
  
  return (
    <div className="w-full">
      <div className="w-full">
        {/* Main content */}
        <div className="w-full">
          {/* Client component that will fetch and display data */}
          <DashboardClient userId={userId} />
        </div>
        
        {/* Sidebar */}
        {/* <div className="w-full md:w-80">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Connect Bank Account</h2>
            <p className="text-slate-400 mb-4">Securely connect your bank account to start tracking your finances.</p>
            <PlaidLinkButton />
          </div>
        </div> */}
      </div>
    </div>
  )
}
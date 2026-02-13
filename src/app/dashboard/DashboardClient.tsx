"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AccountsOverview from './components/AccountsOverview'
import RecentTransactions from './components/RecentTransactions'
import DashboardCharts from './components/DashboardCharts'
import InitialSyncLoader from './components/InitialSyncLoader'
import { useSync } from './hooks/useSync'
import { useDashboardData } from './hooks/useDashboardData'
import { formatCurrency, formatDate } from './utils/formatters'

export default function DashboardClient({ userId }: { userId: string }) {
  // State
  const [timeRange, setTimeRange] = useState<string>('monthly')
  const [showLoader, setShowLoader] = useState(true)
  const [checkingSync, setCheckingSync] = useState(true)

  // Check if initial sync is needed
  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const response = await fetch('/api/plaid/sync-status')
        const data = await response.json()
        
        if (data.success && data.data.allSynced) {
          // Already synced, skip loader
          setShowLoader(false)
        }
      } catch (err) {
        console.error('Error checking sync status:', err)
        // On error, show the dashboard (don't block access)
        setShowLoader(false)
      } finally {
        setCheckingSync(false)
      }
    }
    
    checkSyncStatus()
  }, [])

  // Sync hook
  const { syncing, initialSyncDone, triggerSync } = useSync()

  // Data fetching hook
  const { accounts, transactions, analytics, loading, error, refetch } = useDashboardData({
    selectedAccounts: [],
    dateRange: 'all',
    timeRange,
    customStartDate: '',
    customEndDate: '',
    initialSyncDone,
  })

  // Calculate totals
  const totalBalance = accounts.reduce((sum, account) => {
    const balance = account.balance ? Number(account.balance) : 0
    if (account.type === 'credit') {
      return sum - balance
    }
    return sum + balance
  }, 0)

  const handleRemoveAccount = async (accountId: string) => {
    try {
      const response = await fetch(
        `/api/accounts/disconnect?account_id=${accountId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (response.ok) {
        refetch()
        alert('Account removed successfully')
      } else {
        const errorData = await response.json()
        alert(`Failed to remove account: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Error removing account:', err)
      alert('An error occurred while removing the account')
    }
  }

  const getTimeLabel = () => {
    if (timeRange === 'weekly') return 'This week'
    if (timeRange === 'monthly') return 'This month'
    if (timeRange === 'yearly') return 'This year'
    if (timeRange === 'lastyear') return 'Last year'
    return 'Custom range'
  }

  // Show initial sync loader if needed
  if (checkingSync) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Checking sync status...</p>
      </div>
    )
  }

  if (showLoader) {
    return <InitialSyncLoader onSyncComplete={() => setShowLoader(false)} />
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Loading dashboard data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">Error: {error}</p>
        </div>
        <button
          onClick={refetch}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Retry
        </button>
      </div>
    )
  }

  // Get recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5)

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Accounts Overview */}
        <AccountsOverview
          accounts={accounts}
          totalBalance={totalBalance}
          syncing={syncing}
          onSync={() => triggerSync(false)}
          onRemoveAccount={handleRemoveAccount}
          formatCurrency={formatCurrency}
        />

        {/* Time Range Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Overview - {getTimeLabel()}</h2>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
            <option value="lastyear">Last Year</option>
          </select>
        </div>

        {/* Charts */}
        {analytics && (
          <DashboardCharts
            analytics={analytics}
            timeRange={timeRange}
            formatCurrency={formatCurrency}
          />
        )}
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium text-blue-700">View Analytics</span>
            </Link>
            <Link
              href="/dashboard/transactions"
              className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-medium text-green-700">All Transactions</span>
            </Link>
            <Link
              href="/dashboard/rates"
              className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-amber-700">Interest Rates</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Settings</span>
            </Link>
            <button
              onClick={() => triggerSync(false)}
              disabled={syncing}
              className="w-full flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              <svg className={`w-5 h-5 text-purple-600 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-medium text-purple-700">{syncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white shadow rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">Recent Transactions</h3>
            <Link 
              href="/dashboard/transactions" 
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all →
            </Link>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((tx: any) => {
                // Find account type for this transaction
                const account = accounts.find((a: any) => a.id === tx.account_id)
                const isCreditCard = account?.type === 'credit'
                // For depository: positive = expense (red), negative = income (green)
                // For credit: negative = expense (red), positive = payment (green)
                const isExpense = isCreditCard ? tx.amount < 0 : tx.amount > 0
                
                return (
                  <div key={tx._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
                    </div>
                    <span className={`text-sm font-semibold ml-2 ${isExpense ? 'text-gray-900' : 'text-green-600'}`}>
                      {isExpense ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent transactions</p>
          )}
        </div>
      </div>
    </div>
  )
}

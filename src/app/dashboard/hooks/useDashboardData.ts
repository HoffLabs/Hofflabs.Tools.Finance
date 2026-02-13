import { useState, useEffect } from 'react'

interface UseDashboardDataProps {
  selectedAccounts: string[]
  dateRange: string
  timeRange: string
  customStartDate: string
  customEndDate: string
  initialSyncDone: boolean
}

export function useDashboardData({
  selectedAccounts,
  dateRange,
  timeRange,
  customStartDate,
  customEndDate,
  initialSyncDone,
}: UseDashboardDataProps) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch accounts
      const accountsResponse = await fetch('/api/accounts')
      if (!accountsResponse.ok) throw new Error('Failed to fetch accounts')
      const accountsData = await accountsResponse.json()

      // Fetch transactions
      // Fetch all transactions without limit to get full history
      let transactionsUrl = `/api/transactions`
      if (selectedAccounts.length > 0) {
        selectedAccounts.forEach(accountId => {
          transactionsUrl += `${transactionsUrl.includes('?') ? '&' : '?'}account_id=${accountId}`
        })
      }

      // Only add date range filter if user explicitly filters transactions
      // Otherwise fetch all available data for analytics
      if (dateRange !== 'all') {
        const endDate = new Date()
        const startDate = new Date()
        const daysToSubtract = parseInt(dateRange)
        startDate.setDate(endDate.getDate() - daysToSubtract)

        transactionsUrl += `&start_date=${startDate.toISOString().split('T')[0]}`
        transactionsUrl += `&end_date=${endDate.toISOString().split('T')[0]}`
      }

      const transactionsResponse = await fetch(transactionsUrl)
      if (!transactionsResponse.ok) throw new Error('Failed to fetch transactions')
      const transactionsData = await transactionsResponse.json()

      // Fetch analytics based on time range
      let analyticsUrl = `/api/analytics?time_range=${timeRange}`
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        analyticsUrl += `&start_date=${customStartDate}&end_date=${customEndDate}`
      }
      const analyticsResponse = await fetch(analyticsUrl)
      if (!analyticsResponse.ok) throw new Error('Failed to fetch analytics')
      const analyticsData = await analyticsResponse.json()

      setAccounts(accountsData.data.accounts)
      setTransactions(transactionsData.data.transactions)
      setAnalytics(analyticsData.data)

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  // Fetch data when filters change or after initial sync
  // Use JSON.stringify for array comparison to avoid reference issues
  const selectedAccountsKey = JSON.stringify(selectedAccounts)
  
  useEffect(() => {
    if (initialSyncDone) {
      // For custom range, only fetch if both dates are set
      if (timeRange === 'custom' && (!customStartDate || !customEndDate)) {
        return
      }
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountsKey, dateRange, timeRange, customStartDate, customEndDate, initialSyncDone])

  return {
    accounts,
    transactions,
    analytics,
    loading,
    error,
    refetch: () => fetchData(),
  }
}

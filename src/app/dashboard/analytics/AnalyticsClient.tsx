"use client"

import { useState, useEffect } from 'react'
import AnalyticsHeader from '../components/AnalyticsHeader'
import AnalyticsCards from '../components/AnalyticsCards'
import TopLists from '../components/TopLists'
import { formatCurrency, formatDate } from '../utils/formatters'

export default function AnalyticsClient() {
  const [timeRange, setTimeRange] = useState<string>('monthly')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [analytics, setAnalytics] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [categoryOverrides, setCategoryOverrides] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // TopLists expansion state (lifted here to persist across data refreshes)
  const [showAllMerchants, setShowAllMerchants] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch analytics based on time range
      let analyticsUrl = `/api/analytics?time_range=${timeRange}`
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        analyticsUrl += `&start_date=${customStartDate}&end_date=${customEndDate}`
      }
      const analyticsResponse = await fetch(analyticsUrl)
      if (!analyticsResponse.ok) throw new Error('Failed to fetch analytics')
      const analyticsData = await analyticsResponse.json()

      // Fetch transactions for expanded views
      const transactionsResponse = await fetch('/api/transactions')
      if (!transactionsResponse.ok) throw new Error('Failed to fetch transactions')
      const transactionsData = await transactionsResponse.json()

      // Fetch merchant category overrides
      const overridesResponse = await fetch('/api/merchant-categories')
      if (overridesResponse.ok) {
        const overridesData = await overridesResponse.json()
        const overridesMap = new Map<string, string>()
        if (overridesData.data) {
          for (const override of overridesData.data) {
            overridesMap.set(override.merchant_name, override.category)
          }
        }
        setCategoryOverrides(overridesMap)
      }

      setAnalytics(analyticsData.data)
      setTransactions(transactionsData.data.transactions)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (timeRange === 'custom' && (!customStartDate || !customEndDate)) {
      return
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, customStartDate, customEndDate])

  const handleCategoryUpdate = () => {
    const scrollY = window.scrollY
    fetchData().then(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY)
      })
    })
  }

  const getTimeLabel = () => {
    if (timeRange === 'weekly') return 'This week'
    if (timeRange === 'monthly') return 'This month'
    if (timeRange === 'yearly') return 'This year'
    if (timeRange === 'lastyear') return 'Last year'
    return 'Custom range'
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Loading analytics...</p>
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
          onClick={fetchData}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <AnalyticsHeader
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomStartDateChange={setCustomStartDate}
          onCustomEndDateChange={setCustomEndDate}
        />

        {analytics && (
          <>
            <AnalyticsCards
              totalSpent={analytics.total_spent}
              totalIncome={analytics.total_income}
              netFlow={analytics.net_flow}
              formatCurrency={formatCurrency}
              timeLabel={getTimeLabel()}
            />

            <TopLists
              merchants={analytics.top_merchants || []}
              categories={analytics.category_breakdown || []}
              transactions={transactions}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              onCategoryUpdate={handleCategoryUpdate}
              merchantCategoryOverrides={categoryOverrides}
              timeRange={timeRange}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              showAllMerchants={showAllMerchants}
              onShowAllMerchantsChange={setShowAllMerchants}
              showAllCategories={showAllCategories}
              onShowAllCategoriesChange={setShowAllCategories}
              expandedMerchant={expandedMerchant}
              onExpandedMerchantChange={setExpandedMerchant}
              expandedCategory={expandedCategory}
              onExpandedCategoryChange={setExpandedCategory}
            />
          </>
        )}
      </div>
    </div>
  )
}

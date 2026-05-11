"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { formatCurrency, formatDate, getTimeCost } from '../utils/formatters'
import { autoCategorize, CATEGORIES } from '@/lib/utils/autoCategorizer'

const CATEGORY_COLORS: Record<string, string> = {
  'Housing': 'from-blue-500 to-blue-400', 'Utilities': 'from-amber-500 to-amber-400',
  'Groceries': 'from-emerald-500 to-emerald-400', 'Dining': 'from-orange-500 to-orange-400',
  'Transportation': 'from-cyan-500 to-cyan-400', 'Shopping': 'from-pink-500 to-pink-400',
  'Entertainment': 'from-purple-500 to-purple-400', 'Healthcare': 'from-rose-500 to-rose-400',
  'Insurance': 'from-slate-500 to-slate-400', 'Subscriptions': 'from-violet-500 to-violet-400',
  'Education': 'from-indigo-500 to-indigo-400', 'Fitness': 'from-lime-500 to-lime-400',
  'Travel': 'from-sky-500 to-sky-400', 'Personal Care': 'from-fuchsia-500 to-fuchsia-400',
  'Pets': 'from-yellow-500 to-yellow-400', 'Transfer': 'from-gray-500 to-gray-400',
  'Credit Card Payments': 'from-teal-500 to-teal-400', 'Income': 'from-emerald-600 to-emerald-500',
  'Loan Payment': 'from-orange-600 to-orange-500',
  'Investments': 'from-blue-600 to-blue-500',
  'Software & Digital': 'from-indigo-600 to-indigo-500',
  'Bank Fees': 'from-red-600 to-red-500',
  'Taxes': 'from-amber-600 to-amber-500',
  'Professional Services': 'from-teal-600 to-teal-500',
  'Outdoor & Recreation': 'from-green-600 to-green-500',
  'Uncategorized': 'from-slate-600 to-slate-500',
}

const PAGE_SIZE = 50

export default function ModernTransactionsClient({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [merchantOverrides, setMerchantOverrides] = useState<Map<string, string>>(new Map())
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [statsTimeRange, setStatsTimeRange] = useState<'weekly' | 'monthly' | 'yearly' | 'all'>('all')
  const [selectedType, setSelectedType] = useState<'all' | 'spending' | 'income'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [showCategoryPanel, setShowCategoryPanel] = useState(true)
  const [showStats, setShowStats] = useState(true)
  const [showTimeCost, setShowTimeCost] = useState(true)
  const [showCustomize, setShowCustomize] = useState(false)
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const [aiCategorizing, setAiCategorizing] = useState(false)
  const [aiProgress, setAiProgress] = useState<{ current: number; total: number; phase: string } | null>(null)
  const lastClickedIndexRef = useRef<number>(-1)
  const [loadingAll, setLoadingAll] = useState(false)
  
  // Pagination state
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  // Server-side computed stats (all-time totals)
  const [serverStats, setServerStats] = useState<{
    total_spent: number
    total_income: number
    avg_transaction: number
    transaction_count: number
    category_breakdown: Array<{ name: string; spent: number; count: number }>
  } | null>(null)

  // --- SessionStorage cache helpers ---
  const CACHE_KEY = 'txn_cache'
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  const writeCache = useCallback((key: string, data: any) => {
    try {
      sessionStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify({ ts: Date.now(), data }))
    } catch { /* quota exceeded – ignore */ }
  }, [])

  const readCache = useCallback(<T,>(key: string): T | null => {
    try {
      const raw = sessionStorage.getItem(`${CACHE_KEY}_${key}`)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (Date.now() - parsed.ts > CACHE_TTL) {
        sessionStorage.removeItem(`${CACHE_KEY}_${key}`)
        return null
      }
      return parsed.data as T
    } catch { return null }
  }, [])

  // Fetch transactions with pagination
  const fetchTransactions = useCallback(async (offset = 0, append = false) => {
    try {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)
      
      const res = await fetch(`/api/transactions?limit=${PAGE_SIZE}&offset=${offset}`)
      if (res.ok) {
        const data = await res.json()
        const newTx = data.data.transactions || []
        setTransactions(append ? (prev => [...prev, ...newTx]) : () => newTx)
        setHasMore(data.data.hasMore)
        setTotalCount(data.data.total)
        // Cache first page only
        if (offset === 0) {
          writeCache('transactions', { transactions: newTx, hasMore: data.data.hasMore, total: data.data.total })
        }
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [writeCache])

  // Load more transactions
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchTransactions(transactions.length, true)
    }
  }, [loadingMore, hasMore, transactions.length, fetchTransactions])

  // Load all transactions at once
  const loadAll = useCallback(async () => {
    if (!hasMore || loadingAll) return
    setLoadingAll(true)
    try {
      let offset = transactions.length
      let more = true
      while (more) {
        const res = await fetch(`/api/transactions?limit=200&offset=${offset}`)
        if (!res.ok) break
        const data = await res.json()
        const newTx = data.data.transactions || []
        if (newTx.length > 0) {
          setTransactions(prev => [...prev, ...newTx])
          offset += newTx.length
        }
        more = data.data.hasMore
        setHasMore(data.data.hasMore)
        setTotalCount(data.data.total)
      }
    } catch (err) {
      console.error('Error loading all transactions:', err)
    } finally {
      setLoadingAll(false)
    }
  }, [hasMore, loadingAll, transactions.length])

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }
    
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadMore])

  useEffect(() => {
    // Restore from cache instantly to avoid loading flash
    const cachedTx = readCache<{ transactions: any[]; hasMore: boolean; total: number }>('transactions')
    const cachedAccounts = readCache<any[]>('accounts')
    const cachedOverrides = readCache<Array<{ merchant_name: string; category: string }>>('overrides')
    const cachedStats = readCache<any>('stats_all')
    const cachedIncome = readCache<number>('monthlyIncome')

    let hasCached = false
    if (cachedTx) {
      setTransactions(cachedTx.transactions)
      setHasMore(cachedTx.hasMore)
      setTotalCount(cachedTx.total)
      hasCached = true
    }
    if (cachedAccounts) setAccounts(cachedAccounts)
    if (cachedOverrides) {
      const map = new Map<string, string>()
      for (const o of cachedOverrides) map.set(o.merchant_name, o.category)
      setMerchantOverrides(map)
    }
    if (cachedStats) setServerStats(cachedStats)
    if (cachedIncome) setMonthlyIncome(cachedIncome)
    if (hasCached) setLoading(false)

    // Then refresh in background
    const fetchData = async () => {
      try {
        const [accRes, overridesRes, settingsRes, statsRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/merchant-categories'),
          fetch('/api/user/settings'),
          fetch('/api/stats?time_range=all'),
        ])

        if (accRes.ok) {
          const accData = await accRes.json()
          const accs = accData.data.accounts || []
          setAccounts(accs)
          writeCache('accounts', accs)
        }

        if (overridesRes.ok) {
          const overridesData = await overridesRes.json()
          const map = new Map<string, string>()
          const overridesList: Array<{ merchant_name: string; category: string }> = []
          if (overridesData.data) {
            for (const o of overridesData.data) {
              map.set(o.merchant_name, o.category)
              overridesList.push({ merchant_name: o.merchant_name, category: o.category })
            }
          }
          setMerchantOverrides(map)
          writeCache('overrides', overridesList)
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json()
          const income = settingsData.data?.preferences?.monthlyIncome || 0
          setMonthlyIncome(income)
          writeCache('monthlyIncome', income)
        }
        
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setServerStats(statsData.data)
          writeCache('stats_all', statsData.data)
        }
        
        await fetchTransactions(0, false)
      } catch (err) {
        console.error('Error fetching data:', err)
        setLoading(false)
      }
    }
    fetchData()
  }, [fetchTransactions, readCache, writeCache])
  
  // Refetch stats when time range changes (but not on initial load)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  useEffect(() => {
    if (!initialLoadDone) {
      setInitialLoadDone(true)
      return
    }
    const fetchStats = async () => {
      try {
        const statsRes = await fetch(`/api/stats?time_range=${statsTimeRange}`)
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setServerStats(statsData.data)
        }
      } catch (err) {
        console.error('Error fetching stats:', err)
      }
    }
    fetchStats()
  }, [statsTimeRange, initialLoadDone])

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    return account ? account.name : 'Unknown'
  }

  const getAccountType = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    return account?.type || 'depository'
  }

  const isExpense = (tx: any) => {
    const isCreditCard = getAccountType(tx.account_id) === 'credit'
    return isCreditCard ? tx.amount < 0 : tx.amount > 0
  }

  const getCategory = (tx: any) => autoCategorize(tx.name, merchantOverrides)

  // Filter transactions
  const filteredTx = useMemo(() => {
    return transactions.filter(tx => {
      if (searchQuery && !tx.name.toLowerCase().includes(searchQuery.toLowerCase())) return false

      if (selectedPeriod !== 'all') {
        const txDate = new Date(tx.date)
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - parseInt(selectedPeriod))
        if (txDate < cutoff) return false
      }

      if (selectedType !== 'all') {
        const expense = isExpense(tx)
        if (selectedType === 'spending' && !expense) return false
        if (selectedType === 'income' && expense) return false
      }

      if (selectedCategory) {
        const cat = getCategory(tx)
        if (cat !== selectedCategory) return false
      }

      if (selectedAccount !== 'all' && tx.account_id !== selectedAccount) return false

      const amt = Math.abs(tx.amount)
      if (minAmount && amt < parseFloat(minAmount)) return false
      if (maxAmount && amt > parseFloat(maxAmount)) return false

      return true
    })
  }, [transactions, searchQuery, selectedPeriod, selectedType, selectedCategory, selectedAccount, minAmount, maxAmount, merchantOverrides])

  // Category breakdown for filtered transactions
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, { spent: number; count: number }> = {}
    filteredTx.forEach(tx => {
      if (!isExpense(tx)) return
      const cat = getCategory(tx)
      if (!cats[cat]) cats[cat] = { spent: 0, count: 0 }
      cats[cat].spent += Math.abs(tx.amount)
      cats[cat].count += 1
    })
    return Object.entries(cats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.spent - a.spent)
  }, [filteredTx, merchantOverrides])

  // Group by date
  const groupedByDate: Record<string, any[]> = {}
  filteredTx.forEach(tx => {
    const date = new Date(tx.date).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    })
    if (!groupedByDate[date]) groupedByDate[date] = []
    groupedByDate[date].push(tx)
  })

  const dates = Object.keys(groupedByDate).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  )

  // Use server-computed all-time stats (much more efficient)
  const totalSpending = serverStats?.total_spent || 0
  const totalIncome = serverStats?.total_income || 0
  const avgTransaction = serverStats?.avg_transaction || 0
  
  // Use server-computed category breakdown for the panel
  const serverCategoryBreakdown = serverStats?.category_breakdown || []

  // Category override handler
  const handleCategoryOverride = async (txName: string, newCategory: string) => {
    try {
      const res = await fetch('/api/merchant-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_name: txName.toLowerCase(), category: newCategory }),
      })
      if (res.ok) {
        setMerchantOverrides(prev => {
          const next = new Map(prev)
          next.set(txName.toLowerCase(), newCategory)
          return next
        })
      }
    } catch (err) {
      console.error('Error saving category override:', err)
    }
  }

  // Bulk category assign
  const handleBulkCategoryAssign = async () => {
    if (!bulkCategory || selectedTxIds.size === 0) return
    const names = new Set<string>()
    transactions.forEach(tx => {
      if (selectedTxIds.has(tx.id)) names.add(tx.name.toLowerCase())
    })
    for (const name of Array.from(names)) {
      await handleCategoryOverride(name, bulkCategory)
    }
    setSelectedTxIds(new Set())
    setBulkCategory('')
  }

  const hasSelection = selectedTxIds.size > 0

  // AI auto-categorize: selected items if any, otherwise all uncategorized
  const handleAiCategorize = async () => {
    setAiCategorizing(true)
    try {
      let uniqueNames: string[]

      if (hasSelection) {
        // Categorize only selected transactions that are still uncategorized
        const selectedNames = new Set<string>()
        for (const tx of transactions) {
          if (selectedTxIds.has(tx.id)) {
            // Only include merchants that are still uncategorized
            if (autoCategorize(tx.name, merchantOverrides) === 'Uncategorized') {
              selectedNames.add(tx.name)
            }
          }
        }
        // If all selected are already categorized, fall through to re-categorize all selected names
        if (selectedNames.size === 0) {
          for (const tx of transactions) {
            if (selectedTxIds.has(tx.id)) selectedNames.add(tx.name)
          }
        }
        uniqueNames = Array.from(selectedNames)
        setAiProgress({ current: 0, total: uniqueNames.length, phase: `Categorizing ${uniqueNames.length} merchants...` })
      } else {
        // Default: fetch ALL and find uncategorized
        setAiProgress({ current: 0, total: 0, phase: 'Fetching transactions...' })
        const FETCH_PAGE = 200
        const allNames = new Set<string>()
        let offset = 0
        let fetchMore = true

        while (fetchMore) {
          const res = await fetch(`/api/transactions?limit=${FETCH_PAGE}&offset=${offset}`)
          if (!res.ok) break
          const data = await res.json()
          const txns = data.data.transactions || []
          for (const tx of txns) {
            if (autoCategorize(tx.name, merchantOverrides) === 'Uncategorized') {
              allNames.add(tx.name)
            }
          }
          fetchMore = data.data.hasMore
          offset += txns.length
          setAiProgress({ current: offset, total: data.data.total, phase: `Scanning transactions (${offset}/${data.data.total})...` })
        }
        uniqueNames = Array.from(allNames)
      }

      if (uniqueNames.length === 0) {
        setAiProgress(null)
        setAiCategorizing(false)
        return
      }

      // Collect all new overrides first, then batch update state once at the end
      const newOverrides = new Map<string, string>()
      const totalNames = uniqueNames.length

      // Process in batches of 25 for more reliable AI responses
      const BATCH_SIZE = 25
      for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
        const batch = uniqueNames.slice(i, i + BATCH_SIZE)
        setAiProgress({ current: i, total: totalNames, phase: `Categorizing merchants (${i}/${totalNames})...` })

        const res = await fetch('/api/ai/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: batch }),
        })

        if (!res.ok) {
          console.error('AI categorize request failed:', res.status)
          continue
        }

        const data = await res.json()
        if (data.success && data.data) {
          // Collect results for batch save
          for (const [name, category] of Object.entries(data.data)) {
            if (category && category !== 'Uncategorized') {
              newOverrides.set(name.toLowerCase(), category as string)
            }
          }
        }
      }

      setAiProgress({ current: totalNames, total: totalNames, phase: 'Saving categories...' })

      // Batch save all overrides to database (parallel, limited concurrency)
      if (newOverrides.size > 0) {
        const entries = Array.from(newOverrides.entries())
        const SAVE_BATCH_SIZE = 10 // Save 10 at a time to avoid overwhelming the server
        for (let i = 0; i < entries.length; i += SAVE_BATCH_SIZE) {
          const saveBatch = entries.slice(i, i + SAVE_BATCH_SIZE)
          await Promise.all(
            saveBatch.map(([name, category]) =>
              fetch('/api/merchant-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ merchant_name: name, category }),
              }).catch(err => console.error('Error saving category:', err))
            )
          )
        }

        // Single state update at the end
        setMerchantOverrides(prev => {
          const next = new Map(prev)
          newOverrides.forEach((category, name) => next.set(name, category))
          return next
        })
      }
    } catch (err) {
      console.error('Error auto-categorizing:', err)
    } finally {
      setAiCategorizing(false)
      setAiProgress(null)
    }
  }

  // Build a flat list of tx ids in display order for shift-click range selection
  const flatTxIds = useMemo(() => {
    const ids: string[] = []
    for (const date of dates) {
      for (const tx of groupedByDate[date]) {
        ids.push(tx.id)
      }
    }
    return ids
  }, [dates, groupedByDate])

  const handleTxClick = (txId: string, e: React.MouseEvent) => {
    const currentIndex = flatTxIds.indexOf(txId)

    if (e.shiftKey && lastClickedIndexRef.current >= 0) {
      // Shift-click: select range between last clicked and current
      const start = Math.min(lastClickedIndexRef.current, currentIndex)
      const end = Math.max(lastClickedIndexRef.current, currentIndex)
      const rangeIds = flatTxIds.slice(start, end + 1)
      setSelectedTxIds(prev => {
        const next = new Set(prev)
        rangeIds.forEach(id => next.add(id))
        return next
      })
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd-click: toggle individual without clearing others
      setSelectedTxIds(prev => {
        const next = new Set(prev)
        if (next.has(txId)) next.delete(txId)
        else next.add(txId)
        return next
      })
    } else {
      // Plain click on checkbox: toggle individual
      setSelectedTxIds(prev => {
        const next = new Set(prev)
        if (next.has(txId)) next.delete(txId)
        else next.add(txId)
        return next
      })
    }
    lastClickedIndexRef.current = currentIndex
  }

  const toggleDaySelection = (dayTxs: any[]) => {
    const dayIds = dayTxs.map(tx => tx.id)
    const allSelected = dayIds.every(id => selectedTxIds.has(id))
    setSelectedTxIds(prev => {
      const next = new Set(prev)
      dayIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  const selectAll = () => {
    const allIds = flatTxIds
    const allSelected = allIds.length > 0 && allIds.every(id => selectedTxIds.has(id))
    if (allSelected) {
      setSelectedTxIds(new Set())
    } else {
      setSelectedTxIds(new Set(allIds))
    }
  }

  if (loading) {
    return (
      <div className="w-full p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/4"></div>
          <div className="h-64 bg-slate-800 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">Your Money Flow</h1>
          <p className="text-sm text-slate-500 mt-1">{totalCount.toLocaleString()} transactions</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Global time period for stats */}
          <select
            value={statsTimeRange}
            onChange={(e) => setStatsTimeRange(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={() => setShowCustomize(!showCustomize)}
            className={`btn-ghost text-sm flex items-center gap-1.5 border ${
              showCustomize ? 'border-emerald-500 text-emerald-400' : 'border-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Customize
          </button>
        </div>
      </div>

      {/* Customize panel */}
      {showCustomize && (
        <div className="glass-card p-4 animate-fade-in-up">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Toggle sections:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'stats', label: 'Quick Stats', state: showStats, set: setShowStats },
              { key: 'categories', label: 'Categories', state: showCategoryPanel, set: setShowCategoryPanel },
              { key: 'timeCost', label: 'Time Cost', state: showTimeCost, set: setShowTimeCost },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => item.set(!item.state)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  item.state
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-500'
                }`}
              >
                {item.state ? '\u2713' : '\u25cb'} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats + Category Breakdown - combined compact card */}
      {(showStats || (showCategoryPanel && serverCategoryBreakdown.length > 0)) && (
        <div className="glass-card p-4 animate-fade-in-up space-y-3">
          {/* Stats row */}
          {showStats && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Spent</span>
                <span className="text-sm font-bold text-rose-400">{formatCurrency(totalSpending)}</span>
              </div>
              <div className="w-px h-4 bg-slate-700 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Income</span>
                <span className="text-sm font-bold text-emerald-400">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="w-px h-4 bg-slate-700 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Avg</span>
                <span className="text-sm font-bold text-blue-400">{formatCurrency(avgTransaction)}</span>
              </div>
              <span className="text-[10px] text-slate-600 ml-auto">
                {statsTimeRange === 'weekly' ? 'This week' : statsTimeRange === 'monthly' ? 'This month' : statsTimeRange === 'yearly' ? 'This year' : 'All time'}
              </span>
            </div>
          )}

          {/* Category breakdown - expandable 2-col grid */}
          {showCategoryPanel && serverCategoryBreakdown.length > 0 && (
            <>
              {showStats && <div className="border-t border-slate-700/50" />}
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Categories</h3>
                <div className="flex items-center gap-2">
                  {selectedCategory && (
                    <button onClick={() => setSelectedCategory(null)} className="text-[10px] text-emerald-400 hover:text-emerald-300">
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {(showAllCategories ? serverCategoryBreakdown : serverCategoryBreakdown.slice(0, 8)).map(cat => {
                  const maxAmount = serverCategoryBreakdown[0]?.spent || 1
                  const pct = (cat.spent / maxAmount) * 100
                  return (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                      className={`text-left ${
                        selectedCategory === cat.name ? 'opacity-100' : selectedCategory ? 'opacity-40 hover:opacity-70' : 'opacity-100'
                      } transition-opacity`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${CATEGORY_COLORS[cat.name] || 'from-slate-500 to-slate-400'} flex-shrink-0`} />
                          <span className="text-xs text-slate-300 truncate">{cat.name}</span>
                          <span className="text-[10px] text-slate-600">{cat.count}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-200 tabular-nums ml-2">{formatCurrency(cat.spent)}</span>
                      </div>
                      <div className="h-1 bg-slate-800/60 rounded-full overflow-hidden mt-0.5 ml-3.5">
                        <div
                          className={`h-full bg-gradient-to-r ${CATEGORY_COLORS[cat.name] || 'from-slate-500 to-slate-400'} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
              {serverCategoryBreakdown.length > 8 && (
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors mt-1 flex items-center gap-1 mx-auto"
                >
                  {showAllCategories ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      Show less
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      Show all {serverCategoryBreakdown.length} categories
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Filters + Transactions — unified card */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="all">All time</option>
          </select>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="all">All accounts</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>

          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="Uncategorized">Uncategorized</option>
          </select>

          <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
            {(['all', 'spending', 'income'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                  selectedType === type
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Amount range + AI categorize */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Amount:</span>
            <input
              type="number"
              placeholder="Min"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            <span className="text-xs text-slate-600">-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {aiProgress && (
              <div className="flex items-center gap-2 min-w-[200px]">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-300"
                    style={{ width: `${aiProgress.total > 0 ? Math.round((aiProgress.current / aiProgress.total) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">{aiProgress.phase}</span>
              </div>
            )}
            <button
              onClick={handleAiCategorize}
              disabled={aiCategorizing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${aiCategorizing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {aiCategorizing ? 'Categorizing...' : hasSelection ? `Categorize ${selectedTxIds.size} Selected` : 'Auto-Categorize All'}
            </button>
          </div>
        </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedTxIds.size > 0 && (
          <div className="px-4 py-3 bg-emerald-500/5 border-t border-emerald-500/20 flex items-center gap-3">
            <span className="text-xs text-slate-400">{selectedTxIds.size} selected</span>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              <option value="">Assign category...</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={handleBulkCategoryAssign}
              disabled={!bulkCategory}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedTxIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-300 ml-auto"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Transactions List */}
        {dates.length === 0 ? (
          <div className="p-12 text-center border-t border-slate-700/50">
            <p className="text-slate-400">No transactions found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {/* Select all header */}
            <div className="px-5 py-2 bg-slate-800/30 border-t border-b border-slate-700/50 flex items-center gap-3">
              <input
                type="checkbox"
                checked={flatTxIds.length > 0 && flatTxIds.every(id => selectedTxIds.has(id))}
                onChange={selectAll}
                className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50"
              />
              <span className="text-xs text-slate-500">Select all</span>
              {hasMore && !loadingAll && (
                <button
                  onClick={loadAll}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Show all {totalCount.toLocaleString()}
                </button>
              )}
              {loadingAll && (
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Loading ({transactions.length}/{totalCount})...
                </span>
              )}
              {selectedTxIds.size > 0 && (
                <span className="text-xs text-slate-400 ml-auto">
                  {selectedTxIds.size} selected · <span className="text-slate-600">Shift+click for range, Ctrl+click to toggle</span>
                </span>
              )}
            </div>

            {dates.map((date, dateIdx) => {
              const dayTransactions = groupedByDate[date]
              const dayTotal = dayTransactions.filter(tx => isExpense(tx)).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

              return (
                <div key={date}>
                  {/* Day separator header */}
                  <div className={`px-5 py-2.5 bg-slate-800/50 flex items-center justify-between ${dateIdx > 0 ? 'border-t border-slate-700/50' : ''} border-b border-slate-700/50`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={dayTransactions.every(tx => selectedTxIds.has(tx.id))}
                        onChange={() => toggleDaySelection(dayTransactions)}
                        className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50"
                      />
                      <h3 className="text-sm font-semibold text-slate-300">{date}</h3>
                      <span className="text-xs text-slate-600">{dayTransactions.length} txns</span>
                    </div>
                    <span className="text-sm text-slate-500">{formatCurrency(dayTotal)} spent</span>
                  </div>

                  <div className="divide-y divide-slate-800/50">
                    {dayTransactions.map(tx => {
                      const expense = isExpense(tx)
                      const amount = Math.abs(tx.amount)
                      const category = getCategory(tx)

                      return (
                        <TransactionRow
                          key={tx.id}
                          tx={tx}
                          expense={expense}
                          amount={amount}
                          category={category}
                          accountName={getAccountName(tx.account_id)}
                          monthlyIncome={monthlyIncome}
                          showTimeCost={showTimeCost}
                          selected={selectedTxIds.has(tx.id)}
                          onRowClick={(e) => handleTxClick(tx.id, e)}
                          onCategoryChange={handleCategoryOverride}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}
        
        {/* Infinite scroll trigger / Load more */}
        <div ref={loadMoreRef} className="py-4">
          {loadingMore && (
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm">Loading more...</span>
            </div>
          )}
          {!hasMore && transactions.length > 0 && (
            <p className="text-center text-sm text-slate-600">
              Showing all {totalCount.toLocaleString()} transactions
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Transaction row with inline category editing + shift/ctrl-click support
function TransactionRow({
  tx, expense, amount, category, accountName, monthlyIncome, showTimeCost, selected, onRowClick, onCategoryChange
}: {
  tx: any; expense: boolean; amount: number; category: string; accountName: string;
  monthlyIncome: number; showTimeCost: boolean; selected: boolean;
  onRowClick: (e: React.MouseEvent) => void; onCategoryChange: (name: string, category: string) => void
}) {
  const timeCost = showTimeCost && monthlyIncome > 0 && expense ? getTimeCost(amount, monthlyIncome) : null
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = async (newCat: string) => {
    await onCategoryChange(tx.name, newCat)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div
      className={`px-5 py-3 hover:bg-slate-800/30 transition-colors group cursor-pointer select-none ${selected ? 'bg-emerald-500/5' : ''}`}
      onClick={(e) => {
        // Don't trigger row selection when interacting with the category dropdown or checkbox directly
        if ((e.target as HTMLElement).closest('select')) return
        onRowClick(e)
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={selected}
            readOnly
            className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 flex-shrink-0 pointer-events-none"
          />
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            expense ? 'bg-rose-500/10' : 'bg-emerald-500/10'
          }`}>
            <svg className={`w-4 h-4 ${expense ? 'text-rose-400' : 'text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {expense ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              )}
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{tx.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500">{accountName}</span>
              <span className="text-slate-700">|</span>
              {editing ? (
                <select
                  autoFocus
                  value={category}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={() => setEditing(false)}
                  className="text-xs bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="Uncategorized">Uncategorized</option>
                </select>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-slate-500 hover:text-emerald-400 transition-colors"
                >
                  {saved ? (
                    <span className="text-emerald-400">Saved!</span>
                  ) : (
                    category
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className={`text-sm font-semibold tabular-nums ${
            expense ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {expense ? '-' : '+'}{formatCurrency(amount)}
          </p>
          {timeCost && (
            <p className="text-[10px] text-slate-600 mt-0.5">{timeCost.label}</p>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useMemo } from 'react'
import Modal from '@/app/components/Modal'
import { autoCategorize, CATEGORIES } from '@/lib/utils/autoCategorizer'

type SortField = 'date' | 'amount' | 'name'
type SortDirection = 'asc' | 'desc'
type TransactionType = 'all' | 'expense' | 'income'

export default function TransactionsClient({ userId }: { userId: string }) {
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [categoryOverrides, setCategoryOverrides] = useState<Map<string, string>>(new Map())
  
  // Filter states
  const [dateRange, setDateRange] = useState<string>('30')
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [transactionType, setTransactionType] = useState<TransactionType>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  
  // Sort states
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  
  // Selection states
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  
  // Bulk action modal
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkCategory, setBulkCategory] = useState('')
  const [isSavingBulk, setIsSavingBulk] = useState(false)
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [accountsResponse, transactionsResponse, overridesResponse] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/transactions'),
        fetch('/api/merchant-categories'),
      ])
      
      if (!accountsResponse.ok) throw new Error('Failed to fetch accounts')
      if (!transactionsResponse.ok) throw new Error('Failed to fetch transactions')
      
      const accountsData = await accountsResponse.json()
      const transactionsData = await transactionsResponse.json()
      
      setAccounts(accountsData.data.accounts)
      setAllTransactions(transactionsData.data.transactions)
      
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
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [userId])

  // Get category for a transaction
  const getTransactionCategory = (transaction: any): string => {
    return autoCategorize(transaction.name, categoryOverrides)
  }

  // Check if transaction is expense or income
  const isExpense = (transaction: any): boolean => {
    const isCreditCard = transaction.account?.type === 'credit'
    return isCreditCard ? transaction.amount < 0 : transaction.amount > 0
  }

  // Client-side filtering and sorting
  const filteredAndSortedTransactions = useMemo(() => {
    let result = allTransactions.filter((transaction) => {
      // Filter by accounts (multi-select)
      if (selectedAccounts.size > 0 && !selectedAccounts.has(transaction.account_id)) {
        return false
      }
      
      // Filter by date range
      if (dateRange !== 'all') {
        const transactionDate = new Date(transaction.date)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        const daysAgo = new Date(today)
        daysAgo.setDate(today.getDate() - parseInt(dateRange))
        daysAgo.setHours(0, 0, 0, 0)
        if (transactionDate < daysAgo || transactionDate > today) {
          return false
        }
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!transaction.name.toLowerCase().includes(query)) {
          return false
        }
      }
      
      // Filter by amount range
      const amount = Math.abs(Number(transaction.amount))
      if (minAmount && amount < parseFloat(minAmount)) {
        return false
      }
      if (maxAmount && amount > parseFloat(maxAmount)) {
        return false
      }
      
      // Filter by transaction type
      if (transactionType !== 'all') {
        const txIsExpense = isExpense(transaction)
        if (transactionType === 'expense' && !txIsExpense) return false
        if (transactionType === 'income' && txIsExpense) return false
      }
      
      // Filter by category
      if (selectedCategory) {
        const txCategory = getTransactionCategory(transaction)
        if (txCategory !== selectedCategory) return false
      }
      
      return true
    })
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = Math.abs(Number(a.amount)) - Math.abs(Number(b.amount))
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return result
  }, [allTransactions, selectedAccounts, dateRange, searchQuery, minAmount, maxAmount, transactionType, selectedCategory, sortField, sortDirection, categoryOverrides])

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    const newSelection = new Set(selectedAccounts)
    if (newSelection.has(accountId)) {
      newSelection.delete(accountId)
    } else {
      newSelection.add(accountId)
    }
    setSelectedAccounts(newSelection)
  }

  // Transaction selection
  const toggleTransactionSelection = (transactionId: string) => {
    const newSelection = new Set(selectedTransactions)
    if (newSelection.has(transactionId)) {
      newSelection.delete(transactionId)
    } else {
      newSelection.add(transactionId)
    }
    setSelectedTransactions(newSelection)
  }

  const selectAllVisible = () => {
    const allIds = new Set(filteredAndSortedTransactions.map(t => t.id))
    setSelectedTransactions(allIds)
  }

  const deselectAll = () => {
    setSelectedTransactions(new Set())
  }

  // Bulk category assignment
  const handleBulkCategoryAssign = async () => {
    if (!bulkCategory || selectedTransactions.size === 0) return
    
    setIsSavingBulk(true)
    try {
      // Get unique merchant names from selected transactions
      const selectedTxs = allTransactions.filter(t => selectedTransactions.has(t.id))
      const uniqueMerchants = Array.from(new Set(selectedTxs.map(t => t.name)))
      
      // Save category override for each unique merchant
      for (const merchantName of uniqueMerchants) {
        await fetch('/api/merchant-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant_name: merchantName,
            category: bulkCategory,
          }),
        })
      }
      
      // Refresh overrides
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
      
      setShowBulkModal(false)
      setBulkCategory('')
      setSelectedTransactions(new Set())
    } catch (err) {
      console.error('Error bulk assigning categories:', err)
    } finally {
      setIsSavingBulk(false)
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedAccounts(new Set())
    setDateRange('30')
    setSearchQuery('')
    setMinAmount('')
    setMaxAmount('')
    setTransactionType('all')
    setSelectedCategory('')
    setSortField('date')
    setSortDirection('desc')
  }

  const hasActiveFilters = selectedAccounts.size > 0 || dateRange !== '30' || searchQuery || minAmount || maxAmount || transactionType !== 'all' || selectedCategory

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Get unique categories from transactions
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    allTransactions.forEach(t => {
      cats.add(getTransactionCategory(t))
    })
    return Array.from(cats).sort()
  }, [allTransactions, categoryOverrides])

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Loading transactions...</p>
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
          onClick={fetchAllData}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-6 items-start">
      {/* Filter Sidebar */}
      <aside className={`${sidebarOpen ? 'w-80' : 'w-0'} flex-shrink-0 transition-all duration-300 sticky top-4 self-start`}>
        <div className={`bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden ${!sidebarOpen && 'invisible'}`}>
          {/* Sidebar Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </h2>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-blue-100 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear All
                </button>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Search
              </label>
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Merchant name..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>
            
            {/* Time Period */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Time Period
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="365">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            {/* Transaction Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Type
              </label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'expense', label: 'Expenses' },
                  { value: 'income', label: 'Income' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setTransactionType(type.value as TransactionType)}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                      transactionType === type.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              >
                <option value="">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {/* Amount Range */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Amount Range
              </label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="Min"
                    min="0"
                    step="0.01"
                    className="w-full pl-7 pr-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                  />
                </div>
                <span className="text-gray-400 text-sm">–</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="Max"
                    min="0"
                    step="0.01"
                    className="w-full pl-7 pr-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
            
            {/* Accounts */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Accounts {selectedAccounts.size > 0 && <span className="text-blue-600">({selectedAccounts.size})</span>}
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => toggleAccount(account.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedAccounts.has(account.id)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-gray-50 text-gray-700 border border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <span className="truncate">{account.name}</span>
                    <span className="text-xs text-gray-400 ml-2">••{account.mask}</span>
                  </button>
                ))}
              </div>
              {selectedAccounts.size > 0 && (
                <button
                  onClick={() => setSelectedAccounts(new Set())}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear account selection
                </button>
              )}
            </div>
            
            {/* Sort */}
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="name">Name</option>
                </select>
                <button
                  onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
                  title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortDirection === 'asc' ? (
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Toggle Sidebar Button + Stats Bar */}
        <div className="bg-white shadow-sm rounded-xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={sidebarOpen ? 'Hide Filters' : 'Show Filters'}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Showing</span>
              <span className="font-bold text-blue-600">{filteredAndSortedTransactions.length}</span>
              <span className="text-gray-500">of</span>
              <span className="font-semibold text-gray-900">{allTransactions.length}</span>
              <span className="text-gray-500">transactions</span>
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {[selectedAccounts.size > 0 && 'Accounts', dateRange !== '30' && 'Date', searchQuery && 'Search', (minAmount || maxAmount) && 'Amount', transactionType !== 'all' && 'Type', selectedCategory && 'Category'].filter(Boolean).length} filters active
              </span>
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
        
        {/* Bulk Actions Bar */}
        {selectedTransactions.size > 0 && (
          <div className="bg-blue-600 shadow-lg rounded-xl p-4 mb-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-white font-semibold">
                  {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={deselectAll}
                  className="text-blue-200 hover:text-white text-sm font-medium transition-colors"
                >
                  Deselect All
                </button>
              </div>
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Assign Category
              </button>
            </div>
          </div>
        )}
        
        {/* Transactions List */}
        <div className="bg-white shadow-sm rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">
              Transactions
            </h2>
            {filteredAndSortedTransactions.length > 0 && (
              <button
                onClick={selectedTransactions.size === filteredAndSortedTransactions.length ? deselectAll : selectAllVisible}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                {selectedTransactions.size === filteredAndSortedTransactions.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          
          {filteredAndSortedTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500">No transactions match your filters</p>
              <button
                onClick={clearAllFilters}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredAndSortedTransactions.map((transaction) => {
                const txIsExpense = isExpense(transaction)
                const category = getTransactionCategory(transaction)
                const isSelected = selectedTransactions.has(transaction.id)
                
                return (
                  <div
                    key={transaction.id}
                    onClick={() => toggleTransactionSelection(transaction.id)}
                    className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Selection Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-600 text-sm font-medium">
                          {transaction.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="relative">
                          <p className="font-medium text-gray-900 whitespace-nowrap overflow-hidden" style={{ maskImage: 'linear-gradient(to right, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)' }}>
                            {transaction.name}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {transaction.account.name} • {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className={`font-semibold ${txIsExpense ? 'text-gray-900' : 'text-green-600'}`}>
                        {txIsExpense ? '-' : '+'}{formatCurrency(Math.abs(Number(transaction.amount)))}
                      </p>
                      <p className={`text-sm ${category === 'Uncategorized' ? 'text-gray-400 italic' : 'text-gray-500'}`}>
                        {category}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
      
      {/* Bulk Category Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title={`Assign Category to ${selectedTransactions.size} Transaction${selectedTransactions.size !== 1 ? 's' : ''}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will set the category for all merchants in the selected transactions.
          </p>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a category...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowBulkModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkCategoryAssign}
              disabled={!bulkCategory || isSavingBulk}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingBulk ? 'Saving...' : 'Apply Category'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Modal from '@/app/components/Modal'
import { CATEGORIES, autoCategorize } from '@/lib/utils/autoCategorizer'
import { normalizeMerchantName, calculateSimilarity } from '@/lib/utils/merchantNormalizer'

interface Merchant {
  name: string
  amount: number
  count: number
}

interface Category {
  name: string
  spent: number
  count?: number
}

interface Transaction {
  _id: string
  name: string
  amount: number
  date: string
  category?: string
}

interface TopListsProps {
  merchants: Merchant[]
  categories: Category[]
  transactions: Transaction[]
  formatCurrency: (amount: number) => string
  formatDate: (date: string) => string
  onCategoryUpdate?: () => void
  merchantCategoryOverrides?: Map<string, string>
  timeRange: string
  customStartDate?: string
  customEndDate?: string
  // Controlled state props (optional - for persisting state across parent re-renders)
  showAllMerchants?: boolean
  onShowAllMerchantsChange?: (show: boolean) => void
  showAllCategories?: boolean
  onShowAllCategoriesChange?: (show: boolean) => void
  expandedMerchant?: string | null
  onExpandedMerchantChange?: (merchant: string | null) => void
  expandedCategory?: string | null
  onExpandedCategoryChange?: (category: string | null) => void
}

export default function TopLists({
  merchants,
  categories,
  transactions,
  formatCurrency,
  formatDate,
  onCategoryUpdate,
  merchantCategoryOverrides,
  timeRange,
  customStartDate,
  customEndDate,
  // Controlled state props
  showAllMerchants: controlledShowAllMerchants,
  onShowAllMerchantsChange,
  showAllCategories: controlledShowAllCategories,
  onShowAllCategoriesChange,
  expandedMerchant: controlledExpandedMerchant,
  onExpandedMerchantChange,
  expandedCategory: controlledExpandedCategory,
  onExpandedCategoryChange,
}: TopListsProps) {
  // Calculate date range for filtering transactions
  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date()
    let start: Date
    let end: Date = new Date()
    
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate)
      end = new Date(customEndDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    } else if (timeRange === 'weekly') {
      start = new Date(now)
      const day = start.getDay()
      const diff = start.getDate() - day + (day === 0 ? -6 : 1)
      start.setDate(diff)
      start.setHours(0, 0, 0, 0)
    } else if (timeRange === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      start.setHours(0, 0, 0, 0)
    } else if (timeRange === 'lastyear') {
      const lastYear = now.getFullYear() - 1
      start = new Date(lastYear, 0, 1)
      start.setHours(0, 0, 0, 0)
      end = new Date(lastYear, 11, 31)
      end.setHours(23, 59, 59, 999)
    } else { // yearly
      start = new Date(now.getFullYear(), 0, 1)
      start.setHours(0, 0, 0, 0)
    }
    
    return { start, end }
  }

  // Filter transactions by date range
  const filteredTransactions = transactions.filter(t => {
    const txDate = new Date(t.date)
    const { start, end } = getDateRange()
    return txDate >= start && txDate <= end
  })
  // Use controlled state if provided, otherwise use local state
  const [localShowAllMerchants, setLocalShowAllMerchants] = useState(false)
  const [localShowAllCategories, setLocalShowAllCategories] = useState(false)
  const [localExpandedMerchant, setLocalExpandedMerchant] = useState<string | null>(null)
  const [localExpandedCategory, setLocalExpandedCategory] = useState<string | null>(null)
  
  const showAllMerchants = controlledShowAllMerchants ?? localShowAllMerchants
  const setShowAllMerchants = onShowAllMerchantsChange ?? setLocalShowAllMerchants
  const showAllCategories = controlledShowAllCategories ?? localShowAllCategories
  const setShowAllCategories = onShowAllCategoriesChange ?? setLocalShowAllCategories
  const expandedMerchant = controlledExpandedMerchant ?? localExpandedMerchant
  const setExpandedMerchant = onExpandedMerchantChange ?? setLocalExpandedMerchant
  const expandedCategory = controlledExpandedCategory ?? localExpandedCategory
  const setExpandedCategory = onExpandedCategoryChange ?? setLocalExpandedCategory
  
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [savedMerchant, setSavedMerchant] = useState<string | null>(null)

  // Get transactions for a merchant (using similarity matching)
  const getTransactionsForMerchant = (merchantName: string): Transaction[] => {
    return filteredTransactions.filter(t => {
      // Check if transaction matches this merchant group
      const similarity = calculateSimilarity(t.name, merchantName)
      return similarity >= 0.6
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Get transactions for a category
  const getTransactionsForCategory = (categoryName: string): Transaction[] => {
    return filteredTransactions.filter(t => {
      const txCategory = autoCategorize(t.name, merchantCategoryOverrides)
      return txCategory === categoryName
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const toggleMerchantExpand = (merchantName: string) => {
    setExpandedMerchant(expandedMerchant === merchantName ? null : merchantName)
  }

  const toggleCategoryExpand = (categoryName: string) => {
    setExpandedCategory(expandedCategory === categoryName ? null : categoryName)
  }

  const handleOpenCategoryModal = (merchant: Merchant) => {
    setSelectedMerchant(merchant)
    setSelectedCategory('')
  }

  const handleCloseModal = () => {
    setSelectedMerchant(null)
    setSelectedCategory('')
  }

  const handleSaveCategory = async () => {
    if (!selectedMerchant || !selectedCategory) return

    const merchantName = selectedMerchant.name
    setIsSaving(true)
    try {
      const response = await fetch('/api/merchant-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_name: merchantName,
          category: selectedCategory,
        }),
      })

      if (response.ok) {
        handleCloseModal()
        // Show success indicator on the merchant
        setSavedMerchant(merchantName)
        setTimeout(() => setSavedMerchant(null), 2000)
        // Silently refresh analytics in background
        onCategoryUpdate?.()
      } else {
        console.error('Failed to save category')
      }
    } catch (error) {
      console.error('Error saving category:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Merchants */}
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Merchants</h4>
          <div className="space-y-3">
            {merchants && merchants.length > 0 ? (
              <>
                {(showAllMerchants ? merchants : merchants.slice(0, 5)).map((merchant, index) => {
                  const isExpanded = expandedMerchant === merchant.name
                  const merchantTransactions = isExpanded ? getTransactionsForMerchant(merchant.name) : []
                  
                  return (
                    <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 group"
                        onClick={() => toggleMerchantExpand(merchant.name)}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <span className="text-lg font-bold text-gray-400 flex-shrink-0">#{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-gray-800 block truncate">{merchant.name}</span>
                          <span className="text-xs text-gray-500">
                              {merchant.count} transaction{merchant.count !== 1 ? 's' : ''}
                              {savedMerchant === merchant.name && (
                                <span className="ml-2 text-green-600">✓ Category saved</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-base font-bold text-gray-900">
                            {formatCurrency(merchant.amount)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenCategoryModal(merchant)
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            title="Set category"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </button>
                          <svg 
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50 max-h-64 overflow-y-auto">
                          {merchantTransactions.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                              {merchantTransactions.map((tx) => (
                                <div key={tx._id} className="px-4 py-2 flex justify-between items-center text-sm">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-gray-700 truncate">{tx.name}</p>
                                    <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
                                  </div>
                                  <span className="text-gray-900 font-medium ml-3">
                                    {formatCurrency(Math.abs(tx.amount))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="px-4 py-3 text-sm text-gray-500">No transactions found</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {merchants.length > 5 && (
                  <button
                    onClick={() => setShowAllMerchants(!showAllMerchants)}
                    className="w-full mt-2 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {showAllMerchants ? 'Show Less' : `Show More (${merchants.length - 5} more)`}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">No merchant data available</p>
            )}
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Categories</h4>
          <div className="space-y-3">
            {categories && categories.length > 0 ? (
              <>
                {(showAllCategories ? categories : categories.slice(0, 5)).map((category, index) => {
                  const isExpanded = expandedCategory === category.name
                  const categoryTransactions = isExpanded ? getTransactionsForCategory(category.name) : []
                  
                  return (
                    <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleCategoryExpand(category.name)}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <span className="text-lg font-bold text-gray-400 flex-shrink-0">#{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-gray-800 block truncate">{category.name}</span>
                            {category.count !== undefined && (
                              <span className="text-xs text-gray-500">{category.count} transaction{category.count !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-base font-bold text-gray-900">
                            {formatCurrency(category.spent)}
                          </span>
                          <svg 
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50 max-h-64 overflow-y-auto">
                          {categoryTransactions.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                              {categoryTransactions.map((tx) => (
                                <div key={tx._id} className="px-4 py-2 flex justify-between items-center text-sm">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-gray-700 truncate">{tx.name}</p>
                                    <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
                                  </div>
                                  <span className="text-gray-900 font-medium ml-3">
                                    {formatCurrency(Math.abs(tx.amount))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="px-4 py-3 text-sm text-gray-500">No transactions found</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {categories.length > 5 && (
                  <button
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="w-full mt-2 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {showAllCategories ? 'Show Less' : `Show More (${categories.length - 5} more)`}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">No category data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Category Assignment Modal */}
      <Modal
        isOpen={selectedMerchant !== null}
        onClose={handleCloseModal}
        title="Assign Category"
        size="sm"
      >
        {selectedMerchant && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Merchant</p>
              <p className="font-medium text-gray-900 truncate">{selectedMerchant.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedMerchant.count} transaction{selectedMerchant.count !== 1 ? 's' : ''} • {formatCurrency(selectedMerchant.amount)}
              </p>
            </div>

            <div>
              <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Uncategorized">Uncategorized</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={!selectedCategory || isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

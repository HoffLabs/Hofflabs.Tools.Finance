'use client'

import { useState } from 'react'
import PlaidLinkButton from '@/app/components/PlaidLinkButton'

interface Account {
  id: string
  name: string
  type: string
  subtype?: string
  mask: string
  balance: number
  available_balance: number
  currency: string
}

interface AccountsOverviewProps {
  accounts: Account[]
  totalBalance: number
  syncing: boolean
  onSync: () => void
  onRemoveAccount: (accountId: string) => Promise<void>
  formatCurrency: (amount: number) => string
}

export default function AccountsOverview({
  accounts,
  totalBalance,
  syncing,
  onSync,
  onRemoveAccount,
  formatCurrency,
}: AccountsOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Group accounts by type
  const depositoryAccounts = accounts.filter(a => a.type === 'depository')
  const creditAccounts = accounts.filter(a => a.type === 'credit')
  const otherAccounts = accounts.filter(a => !['depository', 'credit'].includes(a.type))

  const depositoryTotal = depositoryAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)
  const creditTotal = creditAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)

  const getAccountStyle = (type: string, subtype?: string) => {
    if (type === 'depository') {
      if (subtype === 'checking') return { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Checking' }
      if (subtype === 'savings') return { bg: 'bg-green-100', text: 'text-green-600', label: 'Savings' }
      return { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Bank' }
    }
    if (type === 'credit') return { bg: 'bg-purple-100', text: 'text-purple-600', label: 'Credit' }
    if (type === 'loan') return { bg: 'bg-yellow-100', text: 'text-yellow-600', label: 'Loan' }
    if (type === 'investment') return { bg: 'bg-indigo-100', text: 'text-indigo-600', label: 'Investment' }
    return { bg: 'bg-gray-100', text: 'text-gray-600', label: type }
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Summary Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Accounts</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onSync}
              disabled={syncing}
              className={`text-sm px-3 py-1.5 rounded-md ${syncing ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white'} transition-colors`}
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
            <PlaidLinkButton />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Net Worth</p>
            <p className={`text-xl font-bold ${totalBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Cash</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(depositoryTotal)}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Credit Used</p>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(creditTotal)}</p>
          </div>
        </div>
      </div>

      {/* Expandable Accounts List */}
      {accounts.length > 0 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-5 py-3 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span>{accounts.length} connected account{accounts.length !== 1 ? 's' : ''}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isExpanded && (
            <div className="border-t border-gray-100 divide-y divide-gray-100">
              {accounts.map((account) => {
                const style = getAccountStyle(account.type, account.subtype)
                return (
                  <div key={account.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 ${style.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className={`${style.text} font-semibold text-xs`}>
                          {account.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{account.name}</p>
                        <p className="text-xs text-gray-500">{style.label} •••{account.mask}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-sm">
                          {formatCurrency(account.balance || 0)}
                        </p>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (confirm('Remove this account?')) {
                            await onRemoveAccount(account.id)
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                        title="Remove account"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {accounts.length === 0 && (
        <div className="px-5 py-4 text-center text-gray-500 text-sm">
          No accounts connected yet. Click "Add Account" to get started.
        </div>
      )}
    </div>
  )
}

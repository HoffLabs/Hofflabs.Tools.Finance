'use client'

import { useState } from 'react'

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

  const getAccountStyle = (type: string, subtype?: string) => {
    if (type === 'depository') {
      if (subtype === 'checking') return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Checking' }
      if (subtype === 'savings') return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Savings' }
      return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Bank' }
    }
    if (type === 'credit') return { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Credit' }
    if (type === 'loan') return { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Loan' }
    if (type === 'investment') return { bg: 'bg-indigo-500/20', text: 'text-indigo-400', label: 'Investment' }
    return { bg: 'bg-slate-500/20', text: 'text-slate-400', label: type }
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider">Connected Accounts</h3>
        </div>
      </div>

      {accounts.length > 0 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between text-xs sm:text-sm text-slate-400 hover:bg-slate-800/50 transition-colors border-t border-slate-700/50"
          >
            <span>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
            <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isExpanded && (
            <div className="border-t border-slate-700/50">
              {accounts.map((account) => {
                const style = getAccountStyle(account.type, account.subtype)
                return (
                  <div key={account.id} className="px-4 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors border-b border-slate-800/50 last:border-0">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 ${style.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className={`${style.text} font-semibold text-[10px] sm:text-xs`}>
                          {account.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-200 text-sm truncate">{account.name}</p>
                        <p className="text-xs text-slate-500">{style.label} •••{account.mask}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <p className="font-semibold text-slate-200 text-xs sm:text-sm tabular-nums">
                        {formatCurrency(account.balance || 0)}
                      </p>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (confirm('Remove this account?')) await onRemoveAccount(account.id)
                        }}
                        className="p-1 text-slate-600 hover:text-rose-400 rounded transition-colors"
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
        <div className="px-5 py-6 text-center border-t border-slate-700/50">
          <p className="text-sm text-slate-500">No accounts connected yet. 👻</p>
          <p className="text-xs text-slate-600 mt-1">Hit up Settings to link your bank and expose your spending habits.</p>
        </div>
      )}
    </div>
  )
}

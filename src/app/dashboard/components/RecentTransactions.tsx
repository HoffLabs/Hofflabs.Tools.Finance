'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Transaction {
  id: string
  name: string
  amount: number
  date: string
  category: string
  account: {
    name: string
    type: string
  }
}

interface RecentTransactionsProps {
  transactions: Transaction[]
  formatCurrency: (amount: number) => string
  formatDate: (date: string) => string
}

export default function RecentTransactions({
  transactions,
  formatCurrency,
  formatDate,
}: RecentTransactionsProps) {
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const displayedTransactions = showAllTransactions ? transactions : transactions.slice(0, 8)

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Recent Transactions</h2>
        <Link
          href="/dashboard/transactions"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View All
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-gray-500">No transactions found for the selected filters.</p>
      ) : (
        <>
          <div className="space-y-3">
            {displayedTransactions.map((transaction) => {
              // For credit cards, Plaid uses opposite signs:
              // Positive amount = payment (good), Negative amount = charge (expense)
              // For depository: Positive = income, Negative = expense
              const isCreditCard = transaction.account.type === 'credit'
              let displayAmount = Number(transaction.amount)
              let isExpense = false
              
              if (isCreditCard) {
                // For credit cards: negative = charge (expense), positive = payment
                isExpense = transaction.amount < 0
              } else {
                // For depository: positive = income, negative = expense
                isExpense = transaction.amount > 0
                displayAmount = -displayAmount // Flip sign for display
              }
              
              return (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-sm">
                        {transaction.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.name}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.account.name} • {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                      {isExpense ? '-' : '+'}{formatCurrency(Math.abs(displayAmount))}
                    </p>
                    <p className="text-sm text-gray-500">{transaction.category}</p>
                  </div>
                </div>
              )
            })}
          </div>
          {transactions.length > 8 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showAllTransactions ? 'Show Less' : `Show More (${transactions.length - 8} more)`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

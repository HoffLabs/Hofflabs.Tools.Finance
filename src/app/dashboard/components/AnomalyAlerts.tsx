"use client"

import { useMemo } from 'react'
import { formatCurrency } from '../utils/formatters'

interface AnomalyAlertsProps {
  transactions: any[]
  accounts: any[]
}

interface Alert {
  type: 'large' | 'duplicate' | 'unusual' | 'frequency'
  severity: 'warning' | 'critical'
  title: string
  description: string
  amount?: number
  date?: string
}

export default function AnomalyAlerts({ transactions, accounts }: AnomalyAlertsProps) {
  const alerts = useMemo(() => {
    const result: Alert[] = []
    if (!transactions.length) return result

    const isExpense = (tx: any) => {
      const account = accounts.find(a => a.id === tx.account_id)
      return account?.type === 'credit' ? tx.amount < 0 : tx.amount > 0
    }

    const expenses = transactions.filter(isExpense)
    const amounts = expenses.map(tx => Math.abs(tx.amount))
    const avg = amounts.reduce((s, a) => s + a, 0) / (amounts.length || 1)
    const stdDev = Math.sqrt(amounts.reduce((s, a) => s + Math.pow(a - avg, 2), 0) / (amounts.length || 1))
    const threshold = avg + stdDev * 2.5

    // 1. Unusually large transactions (>2.5 std devs above mean)
    const recent = expenses
      .filter(tx => (Date.now() - new Date(tx.date).getTime()) / 86400000 < 30)
    
    recent.forEach(tx => {
      const amt = Math.abs(tx.amount)
      if (amt > threshold && amt > 100) {
        result.push({
          type: 'large',
          severity: amt > threshold * 2 ? 'critical' : 'warning',
          title: 'Unusually large transaction',
          description: `${tx.name} - ${formatCurrency(amt)} is significantly above your average of ${formatCurrency(avg)}`,
          amount: amt,
          date: tx.date,
        })
      }
    })

    // 2. Potential duplicate charges (same merchant + similar amount within 2 days)
    for (let i = 0; i < recent.length; i++) {
      for (let j = i + 1; j < recent.length; j++) {
        const a = recent[i], b = recent[j]
        const sameAmount = Math.abs(Math.abs(a.amount) - Math.abs(b.amount)) < 0.01
        const sameName = a.name.toLowerCase() === b.name.toLowerCase()
        const dayDiff = Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) / 86400000
        if (sameAmount && sameName && dayDiff <= 2 && dayDiff > 0) {
          result.push({
            type: 'duplicate',
            severity: 'critical',
            title: 'Possible duplicate charge',
            description: `${a.name} charged ${formatCurrency(Math.abs(a.amount))} twice within ${Math.ceil(dayDiff)} day(s)`,
            amount: Math.abs(a.amount),
            date: a.date,
          })
          break
        }
      }
    }

    // 3. Unusual spending frequency (>5 transactions from same merchant in a week)
    const merchantFreq: Record<string, number> = {}
    const last7 = recent.filter(tx => (Date.now() - new Date(tx.date).getTime()) / 86400000 < 7)
    last7.forEach(tx => {
      const name = tx.name.toLowerCase()
      merchantFreq[name] = (merchantFreq[name] || 0) + 1
    })
    Object.entries(merchantFreq).forEach(([name, count]) => {
      if (count >= 5) {
        result.push({
          type: 'frequency',
          severity: 'warning',
          title: 'High transaction frequency',
          description: `${count} transactions at ${name} in the past 7 days`,
        })
      }
    })

    return result
  }, [transactions, accounts])

  if (alerts.length === 0) return null

  return (
    <div className="glass-card p-4 sm:p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Transaction Alerts</h3>
        <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{alerts.length}</span>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border ${
              alert.severity === 'critical'
                ? 'bg-rose-500/5 border-rose-500/20'
                : 'bg-amber-500/5 border-amber-500/20'
            }`}
          >
            <svg
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                alert.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'
              }`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              {alert.type === 'duplicate' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              ) : alert.type === 'large' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              )}
            </svg>
            <div className="flex-1 min-w-0">
              <p className={`text-xs sm:text-sm font-medium ${
                alert.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'
              }`}>{alert.title}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{alert.description}</p>
            </div>
            {alert.amount && (
              <span className="text-xs sm:text-sm font-semibold text-slate-300 flex-shrink-0">{formatCurrency(alert.amount)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AccountsOverview from './components/AccountsOverview'
import DashboardCharts from './components/DashboardCharts'
import InitialSyncLoader from './components/InitialSyncLoader'
import { useSync } from './hooks/useSync'
import { useDashboardData } from './hooks/useDashboardData'
import { formatCurrency, formatDate } from './utils/formatters'
import { DashboardSkeleton } from '@/app/components/Skeleton'
import SyncProgressOverlay from './components/SyncProgressOverlay'
import DebtPayoffCalculator from './components/DebtPayoffCalculator'
import EnhancedStatsGrid from './components/EnhancedStatsGrid'
import SpendingStreaks from './components/SpendingStreaks'
import AnomalyAlerts from './components/AnomalyAlerts'
import { estimateTaxes } from './utils/taxEstimator'
import type { PaycheckDeductions } from '@/lib/db/types'

const SECTION_KEYS = [
  { key: 'statsGrid', label: 'Stats' },
  { key: 'anomalies', label: 'Alerts' },
  { key: 'charts', label: 'Charts' },
  { key: 'topMerchants', label: 'Top Merchants' },
  { key: 'topCategories', label: 'Top Categories' },
  { key: 'streaks', label: 'Streaks' },
  { key: 'debtCalculator', label: 'Debt Calculator' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'recentTransactions', label: 'Recent Txns' },
] as const

type SectionKey = (typeof SECTION_KEYS)[number]['key']

export default function DashboardClient({ userId }: { userId: string }) {
  const [timeRange, setTimeRange] = useState<string>('monthly')
  const [showLoader, setShowLoader] = useState(true)
  const [checkingSync, setCheckingSync] = useState(true)
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0)
  const [userAge, setUserAge] = useState<number>(0)
  const [payDay, setPayDay] = useState<number>(0)
  const [zipCode, setZipCode] = useState<string>('')
  const [deductions, setDeductions] = useState<PaycheckDeductions>({})

  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const response = await fetch('/api/plaid/sync-status')
        const data = await response.json()
        if (data.success && data.data.allSynced) setShowLoader(false)
      } catch {
        setShowLoader(false)
      } finally {
        setCheckingSync(false)
      }
    }
    checkSyncStatus()
  }, [])

  const [showCustomize, setShowCustomize] = useState(false)
  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    statsGrid: true,
    anomalies: true,
    charts: true,
    topMerchants: true,
    topCategories: true,
    streaks: true,
    debtCalculator: false,
    accounts: true,
    recentTransactions: true,
  })

  const { syncing, initialSyncDone, triggerSync } = useSync()
  const { accounts, transactions, analytics, loading, error, refetch } = useDashboardData({
    selectedAccounts: [], dateRange: 'all', timeRange,
    customStartDate: '', customEndDate: '', initialSyncDone,
  })

  // Load dashboard section preferences and income
  useEffect(() => {
    fetch('/api/user/settings').then(r => r.ok ? r.json() : null).then(d => {
      const prefs = d?.data?.preferences
      if (prefs?.dashboardSections) {
        setSections(prev => ({ ...prev, ...prefs.dashboardSections }))
      }
      if (prefs?.monthlyIncome) setMonthlyIncome(prefs.monthlyIncome)
      if (prefs?.age) setUserAge(prefs.age)
      if (prefs?.payDay) setPayDay(prefs.payDay)
      if (d?.data?.zipCode) setZipCode(d.data.zipCode)
      if (prefs?.deductions) setDeductions(prefs.deductions)
    }).catch(() => {})
  }, [])

  // Compute take-home pay from tax estimator + deductions
  const annualGross = monthlyIncome * 12
  const taxEstimate = annualGross > 0 && zipCode ? estimateTaxes(annualGross, zipCode) : null
  const totalDeductions = (deductions.retirement || 0) + (deductions.healthInsurance || 0) + (deductions.hsa || 0) + (deductions.dentalVision || 0) + (deductions.otherPreTax || 0)
  const takeHomePay = taxEstimate ? taxEstimate.monthlyTakeHome - totalDeductions : 0

  const toggleSection = (key: SectionKey) => {
    const newVal = !sections[key]
    setSections(prev => ({ ...prev, [key]: newVal }))
    fetch('/api/user/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: { dashboardSections: { [key]: newVal } } }),
    })
  }

  const totalBalance = accounts.reduce((sum, account) => {
    const balance = account.balance ? Number(account.balance) : 0
    return account.type === 'credit' ? sum - balance : sum + balance
  }, 0)

  const depositoryTotal = accounts.filter(a => a.type === 'depository').reduce((s, a) => s + (a.balance || 0), 0)
  const creditTotal = accounts.filter(a => a.type === 'credit').reduce((s, a) => s + (a.balance || 0), 0)

  const handleRemoveAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/disconnect?account_id=${accountId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (response.ok) refetch()
    } catch (err) {
      console.error('Error removing account:', err)
    }
  }

  const getTimeLabel = () => {
    const labels: Record<string, string> = { weekly: 'This week', monthly: 'This month', yearly: 'This year', lastyear: 'Last year' }
    return labels[timeRange] || 'Custom range'
  }

  if (checkingSync) return <DashboardSkeleton />
  if (showLoader) return <InitialSyncLoader onSyncComplete={() => setShowLoader(false)} />
  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Oops, we couldn't fetch your financial chaos</p>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          </div>
          <button onClick={refetch} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    )
  }

  const recentTransactions = transactions.slice(0, 8)
  const topMerchants = analytics?.top_merchants || []
  const topCategories = analytics?.category_breakdown || []

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Sync overlay */}
      {syncing && <SyncProgressOverlay />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up stagger-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{accounts.length} account{accounts.length !== 1 ? 's' : ''} connected</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomize(!showCustomize)}
            className={`btn-ghost text-xs sm:text-sm flex items-center gap-1.5 border ${
              showCustomize ? 'border-emerald-500 text-emerald-400' : 'border-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="hidden sm:inline">Customize</span>
          </button>
          <button
            onClick={() => triggerSync(false)}
            disabled={syncing}
            className="btn-primary text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2"
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Customize panel */}
      {showCustomize && (
        <div className="glass-card p-3 sm:p-4 animate-fade-in-up">
          <p className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Toggle sections:</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {SECTION_KEYS.map(item => (
              <button
                key={item.key}
                onClick={() => toggleSection(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  sections[item.key]
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-500'
                }`}
              >
                {sections[item.key] ? '✓' : '○'} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      {sections.statsGrid && (
        <EnhancedStatsGrid
          totalBalance={totalBalance}
          depositoryTotal={depositoryTotal}
          creditTotal={creditTotal}
          totalSpent={analytics?.total_spent || 0}
          monthlyIncome={monthlyIncome}
          takeHomePay={takeHomePay > 0 ? takeHomePay : undefined}
          effectiveTaxRate={taxEstimate ? taxEstimate.effectiveRate : undefined}
          transactionCount={transactions.length}
          daysInMonth={new Date().getDate()}
          payDay={payDay}
          userAge={userAge}
        />
      )}

      {/* Alerts */}
      {sections.anomalies && transactions.length > 0 && (
        <AnomalyAlerts transactions={transactions} accounts={accounts} />
      )}

      {/* Time Range Header */}
      <div className="flex items-center justify-between animate-fade-in-up stagger-4">
        <h2 className="text-base sm:text-lg font-semibold text-slate-200">Overview - {getTimeLabel()}</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-1.5"
        >
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
          <option value="yearly">This Year</option>
          <option value="lastyear">Last Year</option>
        </select>
      </div>

      {/* Charts + Spending Activity — Spending Trend left, Activity heatmap right */}
      {sections.charts && analytics && (
        <DashboardCharts analytics={analytics} timeRange={timeRange} formatCurrency={formatCurrency} />
      )}

      {/* Spending Activity heatmap (year view) */}
      {sections.streaks && (
        <SpendingStreaks transactions={transactions} accounts={accounts} />
      )}

      {/* Top Merchants + Top Categories */}
      {(sections.topMerchants || sections.topCategories) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {sections.topMerchants && topMerchants.length > 0 && (
            <div className="glass-card p-4 sm:p-5 animate-fade-in-up">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 sm:mb-4">Top Merchants</h3>
              <div className="space-y-2">
                {topMerchants.slice(0, 8).map((merchant: any, i: number) => {
                  const maxAmount = topMerchants[0]?.amount || 1
                  const pct = (merchant.amount / maxAmount) * 100
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-600">#{i + 1}</span>
                          <span className="text-sm text-slate-200 truncate">{merchant.name}</span>
                          <span className="text-xs text-slate-500">{merchant.count}x</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-100 ml-2">{formatCurrency(merchant.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {sections.topCategories && topCategories.length > 0 && (
            <div className="glass-card p-4 sm:p-5 animate-fade-in-up">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 sm:mb-4">Spending by Category</h3>
              <div className="space-y-2">
                {topCategories.slice(0, 8).map((cat: any, i: number) => {
                  const maxAmount = topCategories[0]?.spent || 1
                  const pct = (cat.spent / maxAmount) * 100
                  const colors = ['from-blue-500 to-blue-400', 'from-emerald-500 to-emerald-400', 'from-amber-500 to-amber-400', 'from-rose-500 to-rose-400', 'from-purple-500 to-purple-400', 'from-cyan-500 to-cyan-400', 'from-lime-500 to-lime-400', 'from-pink-500 to-pink-400']
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-600">#{i + 1}</span>
                          <span className="text-sm text-slate-200 truncate">{cat.name}</span>
                          {cat.count && <span className="text-xs text-slate-500">{cat.count}x</span>}
                        </div>
                        <span className="text-sm font-semibold text-slate-100 ml-2">{formatCurrency(cat.spent)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accounts + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {sections.accounts && (
          <div className="animate-fade-in-up">
            <AccountsOverview
              accounts={accounts}
              totalBalance={totalBalance}
              syncing={syncing}
              onSync={() => triggerSync(false)}
              onRemoveAccount={handleRemoveAccount}
              formatCurrency={formatCurrency}
            />
          </div>
        )}

        {sections.recentTransactions && (
          <div className="glass-card p-4 sm:p-5 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider">Recent Transactions</h3>
              <Link href="/dashboard/transactions" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                View all
              </Link>
            </div>
            {recentTransactions.length > 0 ? (
              <div className="space-y-0.5">
                {recentTransactions.map((tx: any) => {
                  const account = accounts.find((a: any) => a.id === tx.account_id)
                  const isCreditCard = account?.type === 'credit'
                  const isExpense = isCreditCard ? tx.amount < 0 : tx.amount > 0
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-2 px-2 sm:py-2.5 sm:px-3 rounded-lg hover:bg-slate-800/50 transition-colors group">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-slate-200 truncate group-hover:text-slate-100">{tx.name}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500">{formatDate(tx.date)}</p>
                      </div>
                      <span className={`text-sm font-semibold ml-3 tabular-nums ${isExpense ? 'text-slate-300' : 'text-emerald-400'}`}>
                        {isExpense ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">No transactions yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Debt Payoff Calculator */}
      {sections.debtCalculator && (
        <DebtPayoffCalculator 
          totalDebt={creditTotal} 
          monthlySpending={analytics?.total_spent || 0}
          monthlyIncome={monthlyIncome}
          userAge={userAge}
        />
      )}
    </div>
  )
}

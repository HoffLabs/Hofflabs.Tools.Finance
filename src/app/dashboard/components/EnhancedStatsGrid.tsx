"use client"

import { useCountUp } from '../hooks/useCountUp'
import { formatCurrency } from '../utils/formatters'

interface StatCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  iconPath: string
  color: string
  subtext?: string
}

function EnhancedStatCard({ label, value, prefix = '', suffix = '', iconPath, color, subtext }: StatCardProps) {
  const animatedValue = useCountUp(value)
  
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-600/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    lime: 'from-lime-600/20 to-lime-500/5 border-lime-500/30 text-lime-400',
    amber: 'from-amber-600/20 to-amber-500/5 border-amber-500/30 text-amber-400',
    rose: 'from-rose-600/20 to-rose-500/5 border-rose-500/30 text-rose-400',
    blue: 'from-blue-600/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    purple: 'from-purple-600/20 to-purple-500/5 border-purple-500/30 text-purple-400',
  }
  const colorClasses = colorMap[color] || colorMap.emerald
  const textColor = color === 'rose' ? 'text-rose-400' : color === 'emerald' ? 'text-emerald-400' : color === 'lime' ? 'text-lime-400' : color === 'amber' ? 'text-amber-400' : color === 'blue' ? 'text-blue-400' : color === 'purple' ? 'text-purple-400' : 'text-slate-100'

  return (
    <div className={`glass-card hover-lift p-3 sm:p-5 bg-gradient-to-br ${colorClasses} transition-all duration-300 group`}>
      <div className="flex items-start justify-between mb-1 sm:mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">{label}</p>
          <p className={`text-xl sm:text-3xl font-bold ${textColor} transition-transform duration-300 group-hover:scale-105 truncate`}>
            {prefix}{suffix ? animatedValue.toFixed(1) : formatCurrency(animatedValue)}{suffix}
          </p>
          {subtext && (
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">{subtext}</p>
          )}
        </div>
        <svg className="w-6 h-6 sm:w-8 sm:h-8 opacity-20 group-hover:opacity-30 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
        </svg>
      </div>
    </div>
  )
}

interface EnhancedStatsGridProps {
  totalBalance: number
  depositoryTotal: number
  creditTotal: number
  totalSpent: number
  monthlyIncome: number
  takeHomePay?: number
  effectiveTaxRate?: number
  transactionCount: number
  daysInMonth: number
  payDay?: number
  userAge?: number
}

function getDaysUntilPayday(payDay: number): number {
  const now = new Date()
  const today = now.getDate()
  const month = now.getMonth()
  const year = now.getFullYear()
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()
  const clampedPayDay = Math.min(payDay, daysInCurrentMonth)
  if (today <= clampedPayDay) return clampedPayDay - today
  const daysInNextMonth = new Date(year, month + 2, 0).getDate()
  const nextPayDay = Math.min(payDay, daysInNextMonth)
  return (daysInCurrentMonth - today) + nextPayDay
}

export default function EnhancedStatsGrid({
  totalBalance,
  depositoryTotal,
  creditTotal,
  totalSpent,
  monthlyIncome,
  takeHomePay,
  effectiveTaxRate,
  transactionCount,
  daysInMonth,
  payDay,
  userAge,
}: EnhancedStatsGridProps) {
  const dailyBurn = totalSpent / (daysInMonth || 30)
  // Use take-home pay for savings rate when available, otherwise fall back to gross
  const incomeForSavings = takeHomePay && takeHomePay > 0 ? takeHomePay : monthlyIncome
  const savingsRate = incomeForSavings > 0 ? ((incomeForSavings - totalSpent) / incomeForSavings) * 100 : 0
  const avgTransaction = transactionCount > 0 ? totalSpent / transactionCount : 0
  const daysUntilPayday = payDay && payDay > 0 ? getDaysUntilPayday(payDay) : null
  const yearsToRetirement = userAge && userAge > 0 ? Math.max(0, 65 - userAge) : null

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      <EnhancedStatCard 
        label="Net Worth" 
        value={totalBalance} 
        iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        color={totalBalance >= 0 ? 'emerald' : 'rose'}
        subtext={totalBalance >= 0 ? "In the green" : "Working on it..."}
      />
      
      <EnhancedStatCard 
        label="Cash" 
        value={depositoryTotal} 
        iconPath="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        color="lime"
        subtext="Available funds"
      />
      
      <EnhancedStatCard 
        label="Debt" 
        value={creditTotal} 
        iconPath="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        color="amber"
        subtext="Credit used"
      />
      
      <EnhancedStatCard 
        label="Monthly Spending" 
        value={totalSpent} 
        iconPath="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        color="blue"
        subtext={`${transactionCount} transactions`}
      />
      
      <EnhancedStatCard 
        label="Daily Burn Rate" 
        value={dailyBurn} 
        iconPath="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        color="rose"
        subtext={`${formatCurrency(dailyBurn * 365)}/yr pace`}
      />
      
      <EnhancedStatCard 
        label="Avg Transaction" 
        value={avgTransaction} 
        iconPath="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        color="purple"
        subtext={`Across ${transactionCount} purchases`}
      />
      
      {incomeForSavings > 0 && (
        <EnhancedStatCard 
          label="Savings Rate" 
          value={savingsRate} 
          suffix="%"
          iconPath="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          color={savingsRate > 20 ? 'emerald' : savingsRate > 0 ? 'blue' : 'rose'}
          subtext={takeHomePay ? 'vs take-home' : savingsRate > 0 ? "Keep it up" : "Time to cut back"}
        />
      )}
      
      {takeHomePay && takeHomePay > 0 ? (
        <EnhancedStatCard 
          label="Take-Home Pay" 
          value={takeHomePay} 
          iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          color="emerald"
          subtext={`${formatCurrency(monthlyIncome)} gross`}
        />
      ) : monthlyIncome > 0 ? (
        <EnhancedStatCard 
          label="Monthly Income" 
          value={monthlyIncome} 
          iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          color="emerald"
          subtext="Gross — set ZIP for taxes"
        />
      ) : null}

      {effectiveTaxRate !== undefined && effectiveTaxRate > 0 && (
        <EnhancedStatCard
          label="Tax Rate"
          value={effectiveTaxRate * 100}
          suffix="%"
          iconPath="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"
          color={effectiveTaxRate < 0.25 ? 'blue' : effectiveTaxRate < 0.35 ? 'amber' : 'rose'}
          subtext="Effective (fed + state + FICA)"
        />
      )}

      {daysUntilPayday !== null && (
        <EnhancedStatCard
          label="Until Payday"
          value={daysUntilPayday}
          suffix={daysUntilPayday === 1 ? ' day' : ' days'}
          iconPath="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          color={daysUntilPayday <= 3 ? 'emerald' : daysUntilPayday <= 7 ? 'blue' : 'purple'}
          subtext={daysUntilPayday === 0 ? 'Payday!' : `Pay day: ${payDay}${['st','nd','rd'][((payDay! % 100)-20)%10-1] || 'th'}`}
        />
      )}

      {yearsToRetirement !== null && yearsToRetirement > 0 && (
        <EnhancedStatCard
          label="To Retirement"
          value={yearsToRetirement}
          suffix={yearsToRetirement === 1 ? ' yr' : ' yrs'}
          iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          color={yearsToRetirement <= 10 ? 'emerald' : yearsToRetirement <= 20 ? 'blue' : 'amber'}
          subtext={`Age ${userAge} — target 65`}
        />
      )}
    </div>
  )
}

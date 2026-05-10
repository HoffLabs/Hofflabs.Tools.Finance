"use client"

import { useMemo } from 'react'
import { useCountUp } from '../hooks/useCountUp'
import { formatCurrency } from '../utils/formatters'

interface GhostPortfolioProps {
  categoryBreakdown: Array<{ name: string; spent: number }>
  totalSpent: number
}

// Compound growth: monthly contribution * ((1 + r/12)^(12*years) - 1) / (r/12)
function futureValue(monthlyAmount: number, years: number, annualReturn = 0.10): number {
  const r = annualReturn / 12
  const n = years * 12
  return monthlyAmount * ((Math.pow(1 + r, n) - 1) / r)
}

export default function GhostPortfolio({ categoryBreakdown, totalSpent }: GhostPortfolioProps) {
  const projections = useMemo(() => {
    const topCats = categoryBreakdown
      .filter(c => c.name !== 'Income' && c.name !== 'Transfer' && c.name !== 'Credit Card Payments')
      .slice(0, 4)

    return {
      total: {
        '1yr': futureValue(totalSpent, 1),
        '5yr': futureValue(totalSpent, 5),
        '10yr': futureValue(totalSpent, 10),
      },
      categories: topCats.map(cat => ({
        name: cat.name,
        monthly: cat.spent,
        '1yr': futureValue(cat.spent, 1),
        '5yr': futureValue(cat.spent, 5),
        '10yr': futureValue(cat.spent, 10),
      })),
    }
  }, [categoryBreakdown, totalSpent])

  const animated10yr = useCountUp(projections.total['10yr'])

  return (
    <div className="glass-card p-5 bg-gradient-to-br from-purple-900/20 to-indigo-900/10 border-purple-500/20 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Ghost Portfolio
        </h3>
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        If you invested what you spent instead (S&P 500 avg 10% return)...
      </p>

      {/* Big 10yr number */}
      <div className="text-center mb-5 py-4 bg-slate-900/50 rounded-xl">
        <p className="text-xs text-slate-500 uppercase mb-1">Your spending in 10 years could be</p>
        <p className="text-4xl font-black text-purple-400">
          {formatCurrency(animated10yr)}
        </p>
        <p className="text-xs text-slate-600 mt-1">
          That's {formatCurrency(totalSpent)}/mo invested for 10 years
        </p>
      </div>

      {/* Time horizons */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center p-2 bg-slate-800/30 rounded-lg">
          <p className="text-xs text-slate-500">1 Year</p>
          <p className="text-sm font-bold text-indigo-400">{formatCurrency(projections.total['1yr'])}</p>
        </div>
        <div className="text-center p-2 bg-slate-800/30 rounded-lg">
          <p className="text-xs text-slate-500">5 Years</p>
          <p className="text-sm font-bold text-violet-400">{formatCurrency(projections.total['5yr'])}</p>
        </div>
        <div className="text-center p-2 bg-slate-800/30 rounded-lg">
          <p className="text-xs text-slate-500">10 Years</p>
          <p className="text-sm font-bold text-purple-400">{formatCurrency(projections.total['10yr'])}</p>
        </div>
      </div>

      {/* Per-category ghosts */}
      {projections.categories.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Your habits, haunting you:</p>
          {projections.categories.map((cat, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-800/30 rounded-lg">
              <div>
                <p className="text-sm text-slate-300">{cat.name}</p>
                <p className="text-xs text-slate-600">{formatCurrency(cat.monthly)}/mo</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-purple-400">
                  {formatCurrency(cat['10yr'])}
                </p>
                <p className="text-[10px] text-slate-600">in 10yr</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

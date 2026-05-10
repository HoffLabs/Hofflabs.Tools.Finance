"use client"

import { useState, useEffect } from 'react'
import { formatCurrency } from '../utils/formatters'

interface DebtPayoffCalculatorProps {
  totalDebt: number
  monthlySpending: number
  monthlyIncome: number
  userAge?: number
}

export default function DebtPayoffCalculator({ 
  totalDebt, 
  monthlySpending, 
  monthlyIncome,
  userAge,
}: DebtPayoffCalculatorProps) {
  const [targetReduction, setTargetReduction] = useState<string>('')
  const [monthsToPayoff, setMonthsToPayoff] = useState<number | null>(null)
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0)

  useEffect(() => {
    if (targetReduction && parseFloat(targetReduction) > 0 && totalDebt > 0) {
      const reduction = parseFloat(targetReduction)
      const payment = reduction
      const months = Math.ceil(totalDebt / payment)
      setMonthsToPayoff(months)
      setMonthlyPayment(payment)
    } else {
      setMonthsToPayoff(null)
      setMonthlyPayment(0)
    }
  }, [targetReduction, totalDebt])

  const debtFreeAge = userAge && userAge > 0 && monthsToPayoff ? userAge + Math.ceil(monthsToPayoff / 12) : null

  const getRoastMessage = () => {
    if (!monthsToPayoff) return null
    
    const ageNote = debtFreeAge ? ` (debt-free at age ${debtFreeAge})` : ''
    if (monthsToPayoff > 120) {
      return `10+ years to go${ageNote}. Maybe consider a side hustle?`
    } else if (monthsToPayoff > 60) {
      return `5+ years of ramen noodles ahead${ageNote}.`
    } else if (monthsToPayoff > 36) {
      return `3 years isn't bad if you stick to it${ageNote}.`
    } else if (monthsToPayoff > 12) {
      return `Under 3 years! You got this${ageNote}.`
    } else {
      return `Under a year${ageNote}. Nice work.`
    }
  }

  const getProgressPercent = () => {
    if (!monthlyPayment || totalDebt === 0) return 0
    return Math.min((monthlyPayment / totalDebt) * 100, 100)
  }

  const debtToIncomeRatio = monthlyIncome > 0 ? (totalDebt / monthlyIncome).toFixed(1) : null

  return (
    <div className="glass-card p-6 animate-fade-in-up stagger-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-200">Debt Freedom Calculator</h3>
          <p className="text-xs text-slate-500">Because hope is important</p>
        </div>
      </div>

      {totalDebt === 0 ? (
        <div className="text-center py-6">
          <p className="text-emerald-400 font-medium">You're debt-free!</p>
          <p className="text-xs text-slate-500 mt-1">Keep it that way, champ.</p>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Total Debt</p>
              <p className="text-lg font-bold text-rose-400">{formatCurrency(totalDebt)}</p>
            </div>
            {debtToIncomeRatio && (
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Debt/Income Ratio</p>
                <p className="text-lg font-bold text-amber-400">{debtToIncomeRatio}x</p>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="mb-4">
            <label htmlFor="target-reduction" className="block text-xs font-medium text-slate-400 mb-2">
              How much can you put toward debt each month?
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                id="target-reduction"
                value={targetReduction}
                onChange={(e) => setTargetReduction(e.target.value)}
                placeholder="500"
                className="input-dark pl-8"
                min="0"
                step="50"
              />
            </div>
            {monthlySpending > 0 && (
              <p className="text-xs text-slate-500 mt-1.5">
                Your avg monthly spending: {formatCurrency(monthlySpending)}
              </p>
            )}
          </div>

          {/* Results */}
          {monthsToPayoff !== null && monthlyPayment > 0 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Freedom in</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {monthsToPayoff} {monthsToPayoff === 1 ? 'month' : 'months'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-lime-500 transition-all duration-500"
                    style={{ width: `${getProgressPercent()}%` }}
                  />
                </div>
              </div>

              {getRoastMessage() && (
                <div className="text-sm text-slate-400 text-center py-2 px-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  {getRoastMessage()}
                </div>
              )}

              <div className="text-xs text-slate-500 space-y-1">
                <p>• Paying {formatCurrency(monthlyPayment)}/month</p>
                <p>• Total interest depends on your APR (we don't judge... much)</p>
                <p>• This assumes you stop adding to your debt (lol good luck)</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

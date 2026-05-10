"use client"

import { useState, useEffect } from 'react'
import { formatCurrency } from '../utils/formatters'

interface AiInsightsProps {
  totalSpent: number
  monthlyIncome: number
  topCategory: string
  transactionCount: number
  averageTransaction: number
  largestTransaction: number
  daysInMonth: number
}

export default function AiInsights({
  totalSpent,
  monthlyIncome,
  topCategory,
  transactionCount,
  averageTransaction,
  largestTransaction,
  daysInMonth
}: AiInsightsProps) {
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Generate interesting stats
    const stats: string[] = []
    
    // Daily burn rate
    const dailyBurn = totalSpent / (daysInMonth || 30)
    stats.push(`💸 You're burning ${formatCurrency(dailyBurn)}/day. That's ${formatCurrency(dailyBurn * 365)}/year if you keep this up.`)
    
    // Income ratio
    if (monthlyIncome > 0) {
      const spendRatio = (totalSpent / monthlyIncome) * 100
      if (spendRatio > 100) {
        stats.push(`🚨 You're spending ${spendRatio.toFixed(0)}% of your income. Math says that's... not sustainable.`)
      } else if (spendRatio > 80) {
        stats.push(`⚠️ You're spending ${spendRatio.toFixed(0)}% of your income. Savings account looking lonely.`)
      } else if (spendRatio > 50) {
        stats.push(`📊 You're spending ${spendRatio.toFixed(0)}% of your income. Could be worse!`)
      } else {
        stats.push(`✨ Only ${spendRatio.toFixed(0)}% of income spent. Look at you being responsible!`)
      }
    }
    
    // Transaction frequency
    const txPerDay = transactionCount / (daysInMonth || 30)
    if (txPerDay > 3) {
      stats.push(`🛒 ${transactionCount} transactions this month (${txPerDay.toFixed(1)}/day). Your credit card is getting a workout.`)
    } else {
      stats.push(`📱 ${transactionCount} transactions this month. Pretty chill spending pace.`)
    }
    
    // Largest transaction
    if (largestTransaction > 0) {
      const largestPercent = (largestTransaction / totalSpent) * 100
      stats.push(`💰 Biggest purchase: ${formatCurrency(largestTransaction)} (${largestPercent.toFixed(0)}% of total). Ouch.`)
    }
    
    // Category addiction
    if (topCategory && topCategory !== 'Uncategorized') {
      stats.push(`🎯 Your ${topCategory} addiction is real. That's where most of your money goes.`)
    }
    
    // Coffee shop math
    if (averageTransaction > 0 && averageTransaction < 15) {
      const coffeeEquivalent = Math.round(totalSpent / 5)
      stats.push(`☕ This month's spending = ${coffeeEquivalent} lattes. Just saying.`)
    }

    setInsights(stats)
    setLoading(false)
  }, [totalSpent, monthlyIncome, topCategory, transactionCount, averageTransaction, largestTransaction, daysInMonth])

  if (loading || insights.length === 0) return null

  return (
    <div className="glass-card p-6 bg-gradient-to-br from-purple-600/10 to-pink-600/10 border-purple-500/20 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold text-purple-400">AI-Powered Insights</h3>
          <p className="text-xs text-slate-500">The brutal truth about your spending</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <span className="text-sm text-slate-200 leading-relaxed">{insight}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

"use client"

import React, { useMemo } from 'react'
import { formatCurrency } from '../utils/formatters'

interface SpendingStreaksProps {
  transactions: any[]
  accounts: any[]
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const WEEKS = 53

interface CellData {
  date: string
  spent: number
  count: number
  dayOfWeek: number
}

export default function SpendingStreaks({ transactions, accounts }: SpendingStreaksProps) {
  const isExpense = (tx: any) => {
    const account = accounts.find((a: any) => a.id === tx.account_id)
    const isCreditCard = account?.type === 'credit'
    return isCreditCard ? tx.amount < 0 : tx.amount > 0
  }

  const { grid, monthLabels, currentStreak, bestStreak, maxSpent } = useMemo(() => {
    const now = new Date()
    now.setHours(23, 59, 59, 999)

    // Go back to the nearest past Sunday that gives us ~1 year
    const endDow = now.getDay()
    const totalDays = WEEKS * 7 + endDow + 1
    const dailySpending: Record<string, number> = {}
    const dailyCounts: Record<string, number> = {}
    const dateKeys: string[] = []

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailySpending[key] = 0
      dailyCounts[key] = 0
      dateKeys.push(key)
    }

    transactions.forEach(tx => {
      if (!isExpense(tx)) return
      const key = new Date(tx.date).toISOString().split('T')[0]
      if (key in dailySpending) {
        dailySpending[key] += Math.abs(tx.amount)
        dailyCounts[key]++
      }
    })

    // Build grid: columns = weeks, rows = days of week (0=Sun .. 6=Sat)
    const grid: CellData[][] = []
    let weekCol: CellData[] = []

    dateKeys.forEach(key => {
      const d = new Date(key)
      const dow = d.getDay()
      weekCol.push({ date: key, spent: dailySpending[key], count: dailyCounts[key], dayOfWeek: dow })
      if (dow === 6) {
        grid.push(weekCol)
        weekCol = []
      }
    })
    if (weekCol.length > 0) {
      while (weekCol.length < 7) {
        weekCol.push({ date: '', spent: -1, count: 0, dayOfWeek: weekCol.length })
      }
      grid.push(weekCol)
    }

    // Month labels
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthLabels: { col: number; label: string }[] = []
    let lastMonth = -1
    grid.forEach((col, colIdx) => {
      for (const cell of col) {
        if (!cell.date) continue
        const m = new Date(cell.date).getMonth()
        if (m !== lastMonth) {
          monthLabels.push({ col: colIdx, label: monthNames[m] })
          lastMonth = m
        }
        break
      }
    })

    const allSpent = Object.values(dailySpending)
    const maxSpent = Math.max(...allSpent, 1)

    // Calculate streaks
    const sortedDays = dateKeys.slice().reverse()
    let currentStreak = 0
    for (const key of sortedDays) {
      if (dailySpending[key] === 0) currentStreak++
      else break
    }

    let bestStreak = 0
    let tempStreak = 0
    for (const key of sortedDays) {
      if (dailySpending[key] === 0) {
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    return { grid, monthLabels, currentStreak, bestStreak, maxSpent }
  }, [transactions, accounts])

  const getHeatColor = (spent: number) => {
    if (spent < 0) return 'bg-transparent'
    if (spent === 0) return 'bg-[#161b22]'           // darkest — no activity
    const ratio = spent / maxSpent
    if (ratio < 0.25) return 'bg-[#0e4429]'          // level 1
    if (ratio < 0.5) return 'bg-[#006d32]'           // level 2
    if (ratio < 0.75) return 'bg-[#26a641]'          // level 3
    return 'bg-[#39d353]'                             // level 4 — most activity
  }

  const formatTip = (cell: CellData) => {
    if (!cell.date) return ''
    const d = new Date(cell.date)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
    if (cell.count === 0) return `${label}: No spending`
    const txLabel = cell.count === 1 ? '1 transaction' : `${cell.count} transactions`
    return `${label}: ${formatCurrency(cell.spent)} (${txLabel})`
  }

  const colCount = grid.length

  return (
    <div className="glass-card p-4 sm:p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider">Spending Activity</h3>
        <div className="flex items-center gap-1.5">
          {currentStreak > 0 && (
            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">{currentStreak}d streak</span>
          )}
          {bestStreak > currentStreak && (
            <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Best: {bestStreak}d</span>
          )}
        </div>
      </div>

      {/* GitHub-style contribution graph — cells fill full width */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `20px repeat(${colCount}, 1fr)`,
          gap: '2px',
          minWidth: '600px',
        }}
      >
        {/* Month labels row */}
        <div />
        {grid.map((_, colIdx) => {
          const label = monthLabels.find(m => m.col === colIdx)
          return (
            <div key={colIdx} className="flex items-end justify-center overflow-hidden">
              {label && <span className="text-[9px] text-slate-500 leading-none whitespace-nowrap">{label.label}</span>}
            </div>
          )
        })}

        {/* Grid cells — 7 rows x colCount columns */}
        {[0, 1, 2, 3, 4, 5, 6].map(dow => (
          <React.Fragment key={dow}>
            <span className="text-right text-[9px] text-slate-600 self-center pr-0.5 leading-none">{DAY_LABELS[dow]}</span>
            {grid.map((col, colIdx) => {
              const cell = col.find(c => c.dayOfWeek === dow)
              if (!cell || cell.spent < 0) {
                return <div key={`${dow}-${colIdx}`} className="aspect-square rounded-[2px]" />
              }
              return (
                <div
                  key={`${dow}-${colIdx}`}
                  className={`aspect-square rounded-[2px] ${getHeatColor(cell.spent)} transition-all hover:scale-[1.5] hover:z-10 cursor-default`}
                  title={formatTip(cell)}
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-2 sm:mt-3">
        <span className="text-[10px] text-slate-600">Less</span>
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#161b22]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#0e4429]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#006d32]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#26a641]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#39d353]" />
        <span className="text-[10px] text-slate-600">More</span>
      </div>
    </div>
  )
}

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb, sqlPlaceholders } from '@/lib/db/client'
import { groupAndFormatMerchants, MerchantSpendingEntry } from '@/lib/utils/merchantNormalizer'
import { autoCategorize } from '@/lib/utils/autoCategorizer'
import type { BankAccount, Transaction, MerchantCategory } from '@/lib/db/types'

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('time_range') || 'weekly'
    const customStartDate = searchParams.get('start_date')
    const customEndDate = searchParams.get('end_date')
    
    let endDate = new Date()
    let startDate: Date
    
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate)
      endDate = new Date(customEndDate)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (timeRange === 'weekly') {
      startDate = new Date()
      const day = startDate.getDay()
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
      startDate.setDate(diff)
      startDate.setHours(0, 0, 0, 0)
    } else if (timeRange === 'monthly') {
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
    } else if (timeRange === 'lastyear') {
      const lastYear = endDate.getFullYear() - 1
      startDate = new Date(lastYear, 0, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(lastYear, 11, 31)
      endDate.setHours(23, 59, 59, 999)
    } else {
      startDate = new Date(endDate.getFullYear(), 0, 1)
      startDate.setHours(0, 0, 0, 0)
    }
    
    const db = await getDb()
    
    const userAccounts = await db.prepare(
      'SELECT id, type FROM bank_accounts WHERE user_id = ?'
    ).bind(userId).all<BankAccount>()
    
    const userAccountIds = userAccounts.results.map((acc: any) => acc.id)
    const accountTypeMap = new Map(userAccounts.results.map((acc: any) => [acc.id, acc.type]))
    
    if (userAccountIds.length === 0) {
      return NextResponse.json({ success: true, data: { total_spent: 0, total_income: 0, net_flow: 0, category_breakdown: [], top_merchants: [], time_range: timeRange } }, { status: 200 })
    }
    
    // Get merchant category overrides
    const userCategoryOverrides = await db.prepare(
      'SELECT merchant_name, category FROM merchant_categories WHERE user_id = ?'
    ).bind(userId).all<MerchantCategory>()
    
    const categoryOverridesMap = new Map<string, string>()
    for (const override of userCategoryOverrides.results) {
      categoryOverridesMap.set(override.merchant_name, override.category)
    }
    
    // Get transactions
    const transactions = await db.prepare(
      `SELECT * FROM transactions WHERE account_id IN (${sqlPlaceholders(userAccountIds.length)}) AND date >= ? AND date <= ? ORDER BY date DESC`
    ).bind(...userAccountIds, startDate.toISOString(), endDate.toISOString()).all<Transaction>()
    
    const transactionsWithType = transactions.results.map((t: any) => ({
      ...t,
      account: { type: accountTypeMap.get(t.account_id) },
    }))
    
    const EXCLUDED_FROM_TOTALS = ['Credit Card Payments', 'Transfer', 'Loan Payment']
    
    const getTransactionCategory = (t: any) => autoCategorize(t.name || 'Unknown', categoryOverridesMap)
    const isExcludedCategory = (t: any) => EXCLUDED_FROM_TOTALS.includes(getTransactionCategory(t))
    const isIncomeCategory = (t: any) => getTransactionCategory(t) === 'Income'
    
    const totalSpent = transactionsWithType
      .filter((t: any) => {
        if (isExcludedCategory(t) || isIncomeCategory(t)) return false
        return t.account.type === 'credit' ? t.amount < 0 : t.amount > 0
      })
      .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)
    
    const totalIncome = transactionsWithType
      .filter((t: any) => {
        if (isExcludedCategory(t)) return false
        const isCreditCard = t.account.type === 'credit'
        return isIncomeCategory(t) || (isCreditCard ? t.amount > 0 : t.amount < 0)
      })
      .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)
    
    // Top merchants
    const merchantSpending: Record<string, MerchantSpendingEntry> = {}
    transactionsWithType
      .filter((t: any) => t.account.type === 'credit' ? t.amount < 0 : t.amount > 0)
      .forEach((t: any) => {
        const merchant = t.name || 'Unknown'
        if (!merchantSpending[merchant]) merchantSpending[merchant] = { amount: 0, count: 0 }
        merchantSpending[merchant].amount += Math.abs(Number(t.amount))
        merchantSpending[merchant].count += 1
      })
    
    const topMerchants = groupAndFormatMerchants(merchantSpending)
    
    // Category breakdown
    const categorySpending: Record<string, { spent: number; count: number }> = {}
    transactionsWithType
      .filter((t: any) => t.account.type === 'credit' ? t.amount < 0 : t.amount > 0)
      .forEach((t: any) => {
        const category = autoCategorize(t.name || 'Unknown', categoryOverridesMap)
        if (!categorySpending[category]) categorySpending[category] = { spent: 0, count: 0 }
        categorySpending[category].spent += Math.abs(Number(t.amount))
        categorySpending[category].count += 1
      })
    
    const categoryBreakdown = Object.entries(categorySpending)
      .map(([name, data]) => ({ name, spent: data.spent, count: data.count, income: 0 }))
      .sort((a, b) => b.spent - a.spent)
    
    // Additional time-range analytics
    let additionalAnalytics = {}
    const expenseTxns = transactionsWithType.filter((t: any) => {
      if (isExcludedCategory(t)) return false
      return t.account.type === 'credit' ? t.amount < 0 : t.amount > 0
    })
    
    if (timeRange === 'weekly') {
      const weeklySpendingByDay: Record<string, number> = {}
      expenseTxns.forEach((t: any) => {
        const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' })
        weeklySpendingByDay[day] = (weeklySpendingByDay[day] || 0) + Math.abs(Number(t.amount))
      })
      additionalAnalytics = { weekly_spending_by_day: weeklySpendingByDay, average_daily_spend: totalSpent / 7 }
    } else if (timeRange === 'monthly') {
      const monthlySpendingByWeek: Record<string, number> = {}
      expenseTxns.forEach((t: any) => {
        const week = Math.ceil(new Date(t.date).getDate() / 7)
        monthlySpendingByWeek[`Week ${week}`] = (monthlySpendingByWeek[`Week ${week}`] || 0) + Math.abs(Number(t.amount))
      })
      additionalAnalytics = { monthly_spending_by_week: monthlySpendingByWeek, average_weekly_spend: totalSpent / 4 }
    } else {
      const yearlySpendingByMonth: Record<string, number> = {}
      expenseTxns.forEach((t: any) => {
        const month = new Date(t.date).toLocaleDateString('en-US', { month: 'short' })
        yearlySpendingByMonth[month] = (yearlySpendingByMonth[month] || 0) + Math.abs(Number(t.amount))
      })
      let monthsForAverage = timeRange === 'yearly' ? new Date().getMonth() + 1 : 12
      additionalAnalytics = { yearly_spending_by_month: yearlySpendingByMonth, average_monthly_spend: monthsForAverage > 0 ? totalSpent / monthsForAverage : 0 }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        total_spent: totalSpent,
        total_income: totalIncome,
        net_flow: totalIncome - totalSpent,
        category_breakdown: categoryBreakdown,
        top_merchants: topMerchants,
        time_range: timeRange,
        ...additionalAnalytics,
      },
    }, { status: 200 })
    
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get analytics' },
      { status: 500 }
    )
  }
}

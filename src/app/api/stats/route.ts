import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb, sqlPlaceholders } from '@/lib/db/client'
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
    const timeRange = searchParams.get('time_range') || 'all'
    
    const db = await getDb()
    
    const userAccounts = await db.prepare(
      'SELECT id, type FROM bank_accounts WHERE user_id = ?'
    ).bind(userId).all<BankAccount>()
    
    const userAccountIds = userAccounts.results.map((acc: any) => acc.id)
    const accountTypeMap = new Map(userAccounts.results.map((acc: any) => [acc.id, acc.type]))
    
    if (userAccountIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { total_spent: 0, total_income: 0, net_flow: 0, transaction_count: 0, avg_transaction: 0, category_breakdown: [] }
      })
    }
    
    // Get user's merchant category overrides
    const userCategoryOverrides = await db.prepare(
      'SELECT merchant_name, category FROM merchant_categories WHERE user_id = ?'
    ).bind(userId).all<MerchantCategory>()
    
    const categoryOverridesMap = new Map<string, string>()
    for (const override of userCategoryOverrides.results) {
      categoryOverridesMap.set(override.merchant_name, override.category)
    }
    
    // Build date filter
    let dateCondition = ''
    const params: any[] = [...userAccountIds]
    
    if (timeRange !== 'all') {
      const now = new Date()
      let startDate: Date
      
      // Calendar-based ranges
      if (timeRange === 'weekly') {
        startDate = new Date()
        const day = startDate.getDay()
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
        startDate.setDate(diff)
        startDate.setHours(0, 0, 0, 0)
      } else if (timeRange === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      } else if (timeRange === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1)
      // Rolling "last N days" ranges
      } else if (timeRange.startsWith('last_')) {
        const days = parseInt(timeRange.replace('last_', ''))
        startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        startDate.setHours(0, 0, 0, 0)
      } else {
        startDate = new Date(now.getFullYear(), 0, 1)
      }
      
      dateCondition = ' AND date >= ? AND date <= ?'
      params.push(startDate.toISOString(), now.toISOString())
    }
    
    const transactions = await db.prepare(
      `SELECT name, amount, account_id FROM transactions WHERE account_id IN (${sqlPlaceholders(userAccountIds.length)})${dateCondition}`
    ).bind(...params).all<Transaction>()
    
    if (transactions.results.length === 0) {
      return NextResponse.json({
        success: true,
        data: { total_spent: 0, total_income: 0, net_flow: 0, transaction_count: 0, avg_transaction: 0, category_breakdown: [] }
      })
    }
    
    const EXCLUDED_CATEGORIES = ['Credit Card Payments', 'Transfer', 'Loan Payment']
    let totalSpent = 0
    let totalIncome = 0
    let expenseCount = 0
    const categorySpending: Record<string, { spent: number; count: number }> = {}
    
    for (const tx of transactions.results) {
      const accountType = accountTypeMap.get(tx.account_id)
      const isCreditCard = accountType === 'credit'
      const isExpense = isCreditCard ? tx.amount < 0 : tx.amount > 0
      
      const merchantName = tx.name || 'Unknown'
      const category = autoCategorize(merchantName, categoryOverridesMap)
      const isExcluded = EXCLUDED_CATEGORIES.includes(category)
      const isIncomeCategory = category === 'Income'
      
      if (!isExcluded) {
        if (isExpense && !isIncomeCategory) {
          totalSpent += Math.abs(tx.amount)
          expenseCount++
        } else if (isIncomeCategory || !isExpense) {
          totalIncome += Math.abs(tx.amount)
        }
      }
      
      if (isExpense && !isExcluded && !isIncomeCategory) {
        if (!categorySpending[category]) {
          categorySpending[category] = { spent: 0, count: 0 }
        }
        categorySpending[category].spent += Math.abs(tx.amount)
        categorySpending[category].count += 1
      }
    }
    
    const categoryBreakdown = Object.entries(categorySpending)
      .map(([name, data]) => ({ name, spent: data.spent, count: data.count }))
      .sort((a, b) => b.spent - a.spent)
    
    return NextResponse.json({
      success: true,
      data: {
        total_spent: totalSpent,
        total_income: totalIncome,
        net_flow: totalIncome - totalSpent,
        transaction_count: transactions.results.length,
        avg_transaction: expenseCount > 0 ? totalSpent / expenseCount : 0,
        category_breakdown: categoryBreakdown,
        time_range: timeRange,
      }
    })
    
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}

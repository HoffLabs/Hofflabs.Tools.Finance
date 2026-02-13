import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getBankAccountsCollection, getTransactionsCollection, getMerchantCategoriesCollection } from '@/lib/db/client'
import { groupAndFormatMerchants, MerchantSpendingEntry } from '@/lib/utils/merchantNormalizer'
import { autoCategorize } from '@/lib/utils/autoCategorizer'

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Parse query parameters for time range
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('time_range') || 'weekly'
    const customStartDate = searchParams.get('start_date')
    const customEndDate = searchParams.get('end_date')
    
    // Set date range based on calendar periods or custom dates
    let endDate = new Date()
    let startDate: Date
    
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      // Use custom date range
      startDate = new Date(customStartDate)
      endDate = new Date(customEndDate)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (timeRange === 'weekly') {
      // Start of current week (Monday)
      startDate = new Date()
      const day = startDate.getDay()
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is Sunday
      startDate.setDate(diff)
      startDate.setHours(0, 0, 0, 0)
    } else if (timeRange === 'monthly') {
      // Start of current month
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
    } else if (timeRange === 'lastyear') {
      // Full previous year (Jan 1 - Dec 31)
      const lastYear = endDate.getFullYear() - 1
      startDate = new Date(lastYear, 0, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(lastYear, 11, 31)
      endDate.setHours(23, 59, 59, 999)
    } else { // yearly
      // Start of current year
      startDate = new Date(endDate.getFullYear(), 0, 1)
      startDate.setHours(0, 0, 0, 0)
    }
    
    const bankAccounts = await getBankAccountsCollection()
    const transactionsCollection = await getTransactionsCollection()
    
    // Get user's accounts with type info
    const userAccounts = await bankAccounts.find(
      { user_id: new ObjectId(userId) },
      { projection: { _id: 1, type: 1 } }
    ).toArray()
    
    const userAccountIds = userAccounts.map(acc => acc._id)
    const accountTypeMap = new Map(userAccounts.map(acc => [acc._id.toString(), acc.type]))
    
    // Get user's merchant category overrides
    const merchantCategoriesCollection = await getMerchantCategoriesCollection()
    const userCategoryOverrides = await merchantCategoriesCollection
      .find({ user_id: new ObjectId(userId) })
      .toArray()
    
    // Build a map for quick lookup
    const categoryOverridesMap = new Map<string, string>()
    for (const override of userCategoryOverrides) {
      categoryOverridesMap.set(override.merchant_name, override.category)
    }
    
    // Get transactions
    const transactions = await transactionsCollection.find({
      account_id: { $in: userAccountIds },
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ date: -1 }).toArray()
    
    // Add account type to transactions
    const transactionsWithType = transactions.map(t => ({
      ...t,
      account: { type: accountTypeMap.get(t.account_id.toString()) },
    }))
    
    // Calculate analytics
    // For credit cards: negative = expense, positive = payment/income
    // For depository: positive = expense, negative = income (Plaid's convention)
    // Exclude "Credit Card Payments" category from totals (they're transfers, not real spending/income)
    const isExcludedCategory = (t: any) => {
      const merchantName = t.name || 'Unknown'
      const category = autoCategorize(merchantName, categoryOverridesMap)
      return category === 'Credit Card Payments'
    }
    
    const totalSpent = transactionsWithType
      .filter((t: any) => {
        if (isExcludedCategory(t)) return false
        const isCreditCard = t.account.type === 'credit'
        return isCreditCard ? t.amount < 0 : t.amount > 0
      })
      .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)
    
    const totalIncome = transactionsWithType
      .filter((t: any) => {
        if (isExcludedCategory(t)) return false
        const isCreditCard = t.account.type === 'credit'
        return isCreditCard ? t.amount > 0 : t.amount < 0
      })
      .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)
    
    const netFlow = totalIncome - totalSpent
    
    // Top merchants with transaction counts
    const merchantSpending: Record<string, MerchantSpendingEntry> = {}
    transactionsWithType
      .filter((t: any) => {
        const isCreditCard = t.account.type === 'credit'
        return isCreditCard ? t.amount < 0 : t.amount > 0
      })
      .forEach((t: any) => {
        const merchant = t.name || 'Unknown'
        if (!merchantSpending[merchant]) {
          merchantSpending[merchant] = { amount: 0, count: 0 }
        }
        merchantSpending[merchant].amount += Math.abs(Number(t.amount))
        merchantSpending[merchant].count += 1
      })
    
    // Group similar merchants and return sorted by spending
    const topMerchants = groupAndFormatMerchants(merchantSpending)
    
    // Category breakdown using auto-categorization
    const categorySpending: Record<string, { spent: number; count: number }> = {}
    transactionsWithType
      .filter((t: any) => {
        const isCreditCard = t.account.type === 'credit'
        return isCreditCard ? t.amount < 0 : t.amount > 0
      })
      .forEach((t: any) => {
        // Use auto-categorization with user overrides
        const merchantName = t.name || 'Unknown'
        const category = autoCategorize(merchantName, categoryOverridesMap)
        
        if (!categorySpending[category]) {
          categorySpending[category] = { spent: 0, count: 0 }
        }
        categorySpending[category].spent += Math.abs(Number(t.amount))
        categorySpending[category].count += 1
      })
    
    const categoryBreakdown = Object.entries(categorySpending)
      .map(([name, data]) => ({ name, spent: data.spent, count: data.count, income: 0 }))
      .sort((a, b) => b.spent - a.spent)
    
    // Additional analytics for different time ranges
    let additionalAnalytics = {}
    
    if (timeRange === 'weekly') {
      // Weekly specific analytics
      const weeklySpendingByDay: Record<string, number> = {}
      transactionsWithType
        .filter((t: any) => {
          if (isExcludedCategory(t)) return false
          const isCreditCard = t.account.type === 'credit'
          return isCreditCard ? t.amount < 0 : t.amount > 0
        })
        .forEach((t: any) => {
          const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' })
          weeklySpendingByDay[day] = (weeklySpendingByDay[day] || 0) + Math.abs(Number(t.amount))
        })
      
      additionalAnalytics = {
        weekly_spending_by_day: weeklySpendingByDay,
        average_daily_spend: totalSpent / 7,
      }
    } else if (timeRange === 'monthly') {
      // Monthly specific analytics
      const monthlySpendingByWeek: Record<string, number> = {}
      transactionsWithType
        .filter((t: any) => {
          if (isExcludedCategory(t)) return false
          const isCreditCard = t.account.type === 'credit'
          return isCreditCard ? t.amount < 0 : t.amount > 0
        })
        .forEach((t: any) => {
          const week = Math.ceil(new Date(t.date).getDate() / 7)
          monthlySpendingByWeek[`Week ${week}`] = (monthlySpendingByWeek[`Week ${week}`] || 0) + Math.abs(Number(t.amount))
        })
      
      additionalAnalytics = {
        monthly_spending_by_week: monthlySpendingByWeek,
        average_weekly_spend: totalSpent / 4,
      }
    } else {
      // Yearly specific analytics (for both 'yearly' and 'lastyear')
      const yearlySpendingByMonth: Record<string, number> = {}
      transactionsWithType
        .filter((t: any) => {
          if (isExcludedCategory(t)) return false
          const isCreditCard = t.account.type === 'credit'
          return isCreditCard ? t.amount < 0 : t.amount > 0
        })
        .forEach((t: any) => {
          const month = new Date(t.date).toLocaleDateString('en-US', { month: 'short' })
          yearlySpendingByMonth[month] = (yearlySpendingByMonth[month] || 0) + Math.abs(Number(t.amount))
        })
      
      // Calculate months for averaging
      let monthsForAverage = 12
      if (timeRange === 'yearly') {
        // For current year, use months elapsed
        const currentDate = new Date()
        monthsForAverage = currentDate.getMonth() + 1
      }
      
      additionalAnalytics = {
        yearly_spending_by_month: yearlySpendingByMonth,
        average_monthly_spend: monthsForAverage > 0 ? totalSpent / monthsForAverage : 0,
      }
    }
    
    return NextResponse.json(
      {
        success: true,
        data: {
          total_spent: totalSpent,
          total_income: totalIncome,
          net_flow: netFlow,
          category_breakdown: categoryBreakdown,
          top_merchants: topMerchants,
          time_range: timeRange,
          ...additionalAnalytics,
        },
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Analytics error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to get analytics' },
      { status: 500 }
    )
  }
}
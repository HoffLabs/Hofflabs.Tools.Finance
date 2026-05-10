import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb, generateId, now, sqlPlaceholders } from '@/lib/db/client'
import { generateSpendingSummary, AiConfig } from '@/lib/ai/categorizer'
import type { User, UserPreferences, BankAccount, Transaction, AiSummary } from '@/lib/db/types'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDb()
    const user = await db.prepare('SELECT preferences FROM users WHERE id = ?').bind(userId).first<User>()
    const prefs: UserPreferences = user?.preferences ? JSON.parse(user.preferences) : {}
    const aiPrefs = prefs.ai
    if (!aiPrefs?.enabled || !aiPrefs.apiUrl || !aiPrefs.model) {
      return NextResponse.json({ success: true, data: { summary: '', enabled: false } })
    }

    // Check cache for today
    const today = new Date().toISOString().split('T')[0]
    const cached = await db.prepare(
      'SELECT summary FROM ai_summaries WHERE user_id = ? AND date = ?'
    ).bind(userId, today).first<AiSummary>()
    if (cached) {
      return NextResponse.json({ success: true, data: { summary: cached.summary, enabled: true } })
    }

    // Gather spending data
    const userAccounts = await db.prepare(
      'SELECT id FROM bank_accounts WHERE user_id = ?'
    ).bind(userId).all<BankAccount>()
    const accountIds = userAccounts.results.map((a: any) => a.id)

    if (accountIds.length === 0) {
      return NextResponse.json({ success: true, data: { summary: '', enabled: true } })
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const transactions = await db.prepare(
      `SELECT name, amount, category FROM transactions WHERE account_id IN (${sqlPlaceholders(accountIds.length)}) AND date >= ?`
    ).bind(...accountIds, startOfMonth.toISOString()).all<Transaction>()

    const merchantSpending: Record<string, number> = {}
    const categorySpending: Record<string, number> = {}
    let totalSpent = 0

    for (const tx of transactions.results) {
      const amount = Math.abs(Number(tx.amount))
      const name = tx.name || 'Unknown'
      merchantSpending[name] = (merchantSpending[name] || 0) + amount
      categorySpending[tx.category || 'Uncategorized'] = (categorySpending[tx.category || 'Uncategorized'] || 0) + amount
      totalSpent += amount
    }

    const topMerchants = Object.entries(merchantSpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }))

    const topCategory = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Nothing'

    const aiConfig: AiConfig = {
      enabled: true,
      apiUrl: aiPrefs.apiUrl,
      apiKey: aiPrefs.apiKey || '',
      model: aiPrefs.model,
    }

    const summary = await generateSpendingSummary({ totalSpent, topMerchants, topCategory }, aiConfig)

    if (summary) {
      await db.prepare(
        `INSERT INTO ai_summaries (id, user_id, date, summary, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, date) DO UPDATE SET summary = excluded.summary`
      ).bind(generateId(), userId, today, summary, now()).run()
    }

    return NextResponse.json({ success: true, data: { summary, enabled: true } })
  } catch (error: any) {
    console.error('AI summary error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

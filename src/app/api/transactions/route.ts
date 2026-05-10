import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb, sqlPlaceholders } from '@/lib/db/client'
import type { Transaction, BankAccount } from '@/lib/db/types'

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
    const accountIds = searchParams.getAll('account_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const limit = limitParam ? parseInt(limitParam) : 50
    const offset = offsetParam ? parseInt(offsetParam) : 0
    
    const db = await getDb()
    
    // Get user's accounts
    const userAccounts = await db.prepare(
      'SELECT id, name, mask, type FROM bank_accounts WHERE user_id = ?'
    ).bind(userId).all<BankAccount>()
    
    const userAccountIds = userAccounts.results.map((acc: any) => acc.id)
    const accountMap = new Map<string, BankAccount>(userAccounts.results.map((acc: any) => [acc.id, acc]))
    
    if (userAccountIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { transactions: [], count: 0, total: 0, offset, limit, hasMore: false },
      }, { status: 200 })
    }
    
    // Build query
    const filterAccountIds = accountIds.length > 0 ? accountIds : userAccountIds
    const conditions: string[] = [`account_id IN (${sqlPlaceholders(filterAccountIds.length)})`]
    const params: any[] = [...filterAccountIds]
    
    if (startDate) {
      conditions.push('date >= ?')
      params.push(startDate)
    }
    if (endDate) {
      conditions.push('date <= ?')
      params.push(endDate)
    }
    
    const where = conditions.join(' AND ')
    
    // Get total count
    const countResult = await db.prepare(
      `SELECT COUNT(*) as count FROM transactions WHERE ${where}`
    ).bind(...params).first<{ count: number }>()
    const totalCount = countResult?.count || 0
    
    // Get transactions with pagination
    const transactions = await db.prepare(
      `SELECT * FROM transactions WHERE ${where} ORDER BY date DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all<Transaction>()
    
    const transformedTransactions = transactions.results.map((txn: any) => {
      const account = accountMap.get(txn.account_id)
      return {
        id: txn.id,
        account_id: txn.account_id,
        plaid_transaction_id: txn.plaid_transaction_id,
        name: txn.name,
        amount: txn.amount,
        currency: txn.currency,
        category: txn.category,
        date: txn.date,
        pending: !!txn.pending,
        created_at: txn.created_at,
        updated_at: txn.updated_at,
        account: account ? {
          id: account.id,
          name: account.name,
          mask: account.mask,
          type: account.type,
        } : null,
      }
    })
    
    return NextResponse.json(
      {
        success: true,
        data: {
          transactions: transformedTransactions,
          count: transformedTransactions.length,
          total: totalCount,
          offset,
          limit,
          hasMore: offset + transformedTransactions.length < totalCount,
        },
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Error getting transactions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get transactions' },
      { status: 500 }
    )
  }
}

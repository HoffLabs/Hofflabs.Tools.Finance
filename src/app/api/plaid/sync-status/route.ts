import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb } from '@/lib/db/client'
import type { BankAccount } from '@/lib/db/types'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const db = await getDb()
    const bankAccounts = await db.prepare(
      'SELECT id, name, initial_sync_complete, last_transaction_sync, total_transactions, earliest_transaction FROM bank_accounts WHERE user_id = ?'
    ).bind(userId).all<BankAccount>()
    
    if (bankAccounts.results.length === 0) {
      return NextResponse.json(
        { success: true, data: { hasAccounts: false, allSynced: true, accounts: [] } },
        { status: 200 }
      )
    }
    
    const transformedAccounts = bankAccounts.results.map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      initial_sync_complete: !!acc.initial_sync_complete,
      last_transaction_sync: acc.last_transaction_sync,
      total_transactions: acc.total_transactions,
      earliest_transaction: acc.earliest_transaction,
    }))
    
    const allSynced = transformedAccounts.every((account: any) => account.initial_sync_complete)
    
    return NextResponse.json(
      { success: true, data: { hasAccounts: true, allSynced, accounts: transformedAccounts } },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Error checking sync status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check sync status' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb, sqlPlaceholders } from '@/lib/db/client'
import type { BankAccount } from '@/lib/db/types'

export async function DELETE() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const db = await getDb()
    
    // Get user's bank account IDs
    const userAccounts = await db.prepare(
      'SELECT id FROM bank_accounts WHERE user_id = ?'
    ).bind(userId).all<BankAccount>()
    const accountIds = userAccounts.results.map((acc: any) => acc.id)
    
    // Delete all transactions for user's accounts
    if (accountIds.length > 0) {
      await db.prepare(
        `DELETE FROM transactions WHERE account_id IN (${sqlPlaceholders(accountIds.length)})`
      ).bind(...accountIds).run()
    }
    
    // Delete related data (order matters for FK constraints)
    await db.prepare('DELETE FROM bank_accounts WHERE user_id = ?').bind(userId).run()
    await db.prepare('DELETE FROM sync_logs WHERE user_id = ?').bind(userId).run()
    await db.prepare('DELETE FROM merchant_categories WHERE user_id = ?').bind(userId).run()
    await db.prepare('DELETE FROM ai_summaries WHERE user_id = ?').bind(userId).run()
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run()
    await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
    
    return NextResponse.json(
      { success: true, message: 'Account deleted successfully' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}

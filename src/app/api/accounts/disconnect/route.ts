import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb } from '@/lib/db/client'
import type { BankAccount } from '@/lib/db/types'

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
     
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
     
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account_id')
     
    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      )
    }
    
    const db = await getDb()
    
    const account = await db.prepare(
      'SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?'
    ).bind(accountId, userId).first<BankAccount>()
    
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }
    
    // Delete transactions first (FK constraint), then account
    await db.prepare('DELETE FROM transactions WHERE account_id = ?').bind(accountId).run()
    await db.prepare('DELETE FROM bank_accounts WHERE id = ?').bind(accountId).run()
    
    return NextResponse.json(
      { success: true, message: 'Account disconnected successfully' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Disconnect account error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect account' },
      { status: 500 }
    )
  }
}

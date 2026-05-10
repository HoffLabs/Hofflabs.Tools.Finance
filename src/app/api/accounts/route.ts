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
    const accounts = await db.prepare(
      'SELECT id, name, type, subtype, mask, balance, available_balance, currency FROM bank_accounts WHERE user_id = ?'
    ).bind(userId).all<BankAccount>()
    
    const transformedAccounts = accounts.results.map((acc: BankAccount) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      subtype: acc.subtype,
      mask: acc.mask,
      balance: acc.balance,
      available_balance: acc.available_balance,
      currency: acc.currency,
    }))
    
    const totalBalance = transformedAccounts.reduce((sum: number, account: typeof transformedAccounts[0]) => {
      const balance = account.balance ? Number(account.balance) : 0
      if (account.type === 'credit') {
        return sum - balance
      }
      return sum + balance
    }, 0)
    
    return NextResponse.json(
      {
        success: true,
        data: {
          accounts: transformedAccounts,
          total_balance: totalBalance,
          account_count: transformedAccounts.length,
        },
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Error getting accounts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get accounts' },
      { status: 500 }
    )
  }
}

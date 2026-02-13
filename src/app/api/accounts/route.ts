import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getBankAccountsCollection } from '@/lib/db/client'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const bankAccounts = await getBankAccountsCollection()
    
    // Get all bank accounts for the user with balances
    const accounts = await bankAccounts.find(
      { user_id: new ObjectId(userId) },
      {
        projection: {
          _id: 1,
          name: 1,
          type: 1,
          subtype: 1,
          mask: 1,
          balance: 1,
          available_balance: 1,
          currency: 1,
        },
      }
    ).toArray()
    
    // Transform _id to id for frontend compatibility
    const transformedAccounts = accounts.map(acc => ({
      id: acc._id.toString(),
      name: acc.name,
      type: acc.type,
      subtype: acc.subtype,
      mask: acc.mask,
      balance: acc.balance,
      available_balance: acc.available_balance,
      currency: acc.currency,
    }))
    
    // Calculate total balance across all accounts
    // Credit cards are debt, so their balances should be subtracted
    const totalBalance = transformedAccounts.reduce((sum: number, account: any) => {
      const balance = account.balance ? Number(account.balance) : 0
      // For credit accounts, subtract the balance (it's money owed)
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

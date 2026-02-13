import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getBankAccountsCollection, getTransactionsCollection } from '@/lib/db/client'

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
     
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
     
    // Get accountId from query parameters instead of request body
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account_id')
     
    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      )
    }
    
    const bankAccounts = await getBankAccountsCollection()
    const transactions = await getTransactionsCollection()
    
    // Verify the account belongs to the user
    const account = await bankAccounts.findOne({
      _id: new ObjectId(accountId),
      user_id: new ObjectId(userId),
    })
    
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }
    
    // Delete the account and all associated transactions
    await transactions.deleteMany({ account_id: new ObjectId(accountId) })
    await bankAccounts.deleteOne({ _id: new ObjectId(accountId) })
    
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

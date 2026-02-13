import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getBankAccountsCollection, getTransactionsCollection } from '@/lib/db/client'

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const accountIds = searchParams.getAll('account_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : null // null means no limit
    
    const bankAccounts = await getBankAccountsCollection()
    const transactionsCollection = await getTransactionsCollection()
    
    // Get user's account IDs first
    const userAccounts = await bankAccounts.find(
      { user_id: new ObjectId(userId) },
      { projection: { _id: 1, name: 1, mask: 1, type: 1 } }
    ).toArray()
    
    const userAccountIds = userAccounts.map(acc => acc._id)
    const accountMap = new Map(userAccounts.map(acc => [acc._id.toString(), acc]))
    
    // Build query filter
    const filter: any = {
      account_id: { $in: userAccountIds },
    }
    
    // Filter by accounts if specified
    if (accountIds.length > 0) {
      filter.account_id = {
        $in: accountIds.map(id => new ObjectId(id)),
      }
    }
    
    // Filter by date range if specified
    if (startDate || endDate) {
      filter.date = {}
      if (startDate) {
        filter.date.$gte = new Date(startDate)
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate)
      }
    }
    
    // Get transactions
    let query = transactionsCollection.find(filter).sort({ date: -1 })
    
    if (limit !== null) {
      query = query.limit(limit)
    }
    
    const transactions = await query.toArray()
    
    // Transform and include account info
    const transformedTransactions = transactions.map(txn => {
      const account = accountMap.get(txn.account_id.toString())
      return {
        id: txn._id.toString(),
        account_id: txn.account_id.toString(),
        plaid_transaction_id: txn.plaid_transaction_id,
        name: txn.name,
        amount: txn.amount,
        currency: txn.currency,
        category: txn.category,
        date: txn.date,
        pending: txn.pending,
        created_at: txn.created_at,
        updated_at: txn.updated_at,
        account: account ? {
          id: account._id.toString(),
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

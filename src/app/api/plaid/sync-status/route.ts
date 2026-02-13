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
    
    const bankAccountsCollection = await getBankAccountsCollection()
    
    // Get all bank accounts for the user
    const bankAccounts = await bankAccountsCollection.find(
      { user_id: new ObjectId(userId) },
      {
        projection: {
          _id: 1,
          name: 1,
          initial_sync_complete: 1,
          last_transaction_sync: 1,
          total_transactions: 1,
          earliest_transaction: 1,
        },
      }
    ).toArray()
    
    if (bankAccounts.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          data: {
            hasAccounts: false,
            allSynced: true,
            accounts: [],
          }
        },
        { status: 200 }
      )
    }
    
    // Transform _id to id
    const transformedAccounts = bankAccounts.map(acc => ({
      id: acc._id.toString(),
      name: acc.name,
      initial_sync_complete: acc.initial_sync_complete,
      last_transaction_sync: acc.last_transaction_sync,
      total_transactions: acc.total_transactions,
      earliest_transaction: acc.earliest_transaction,
    }))
    
    const allSynced = transformedAccounts.every(account => account.initial_sync_complete)
    
    return NextResponse.json(
      { 
        success: true, 
        data: {
          hasAccounts: true,
          allSynced,
          accounts: transformedAccounts,
        }
      },
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

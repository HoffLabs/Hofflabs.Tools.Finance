import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCurrentUserId } from '@/lib/auth/utils'
import {
  getUsersCollection,
  getBankAccountsCollection,
  getTransactionsCollection,
  getSyncLogsCollection,
  getSessionsCollection,
} from '@/lib/db/client'

export async function DELETE() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const userObjectId = new ObjectId(userId)
    
    const users = await getUsersCollection()
    const bankAccounts = await getBankAccountsCollection()
    const transactions = await getTransactionsCollection()
    const syncLogs = await getSyncLogsCollection()
    const sessions = await getSessionsCollection()
    
    // Get user's bank account IDs first
    const userAccounts = await bankAccounts.find(
      { user_id: userObjectId },
      { projection: { _id: 1 } }
    ).toArray()
    const accountIds = userAccounts.map(acc => acc._id)
    
    // Delete all user data
    // Delete all transactions for user's accounts
    if (accountIds.length > 0) {
      await transactions.deleteMany({ account_id: { $in: accountIds } })
    }
    
    // Delete all bank accounts
    await bankAccounts.deleteMany({ user_id: userObjectId })
    
    // Delete all sync logs
    await syncLogs.deleteMany({ user_id: userObjectId })
    
    // Delete all sessions
    await sessions.deleteMany({ user_id: userObjectId })
    
    // Delete the user
    await users.deleteOne({ _id: userObjectId })
    
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

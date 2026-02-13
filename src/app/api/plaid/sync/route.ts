import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getAccounts, getTransactions, getAllTransactionsSync, refreshTransactions } from '@/lib/plaid/client'
import { getBankAccountsCollection, getTransactionsCollection } from '@/lib/db/client'
import { decryptData, encryptData } from '@/lib/crypto/encryption'
import { InsertTransaction } from '@/lib/db/types'

export async function POST() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get master key from environment
    const masterKey = process.env.MASTER_ENCRYPTION_KEY
    if (!masterKey) {
      throw new Error('Master encryption key not configured')
    }
    
    const bankAccountsCollection = await getBankAccountsCollection()
    const transactionsCollection = await getTransactionsCollection()
    
    // Get all bank accounts for the user
    const bankAccounts = await bankAccountsCollection.find(
      { user_id: new ObjectId(userId) }
    ).toArray()
    
    if (bankAccounts.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No accounts to sync' },
        { status: 200 }
      )
    }
    
    // Cache Plaid data per item to avoid rate limits
    const plaidDataCache = new Map<string, any[]>()
    const syncStats = {
      totalAccounts: bankAccounts.length,
      accountsSynced: 0,
      totalTransactions: 0,
      newTransactions: 0,
    }
    
    // Sync each account
    for (const account of bankAccounts) {
      // Decrypt the access token
      const accessToken = await decryptData(account.plaid_access_token, masterKey)
      
      // Check cache first to avoid duplicate API calls for same item
      let plaidAccounts: any[]
      if (plaidDataCache.has(account.plaid_item_id)) {
        plaidAccounts = plaidDataCache.get(account.plaid_item_id)!
        console.log(`Using cached data for item ${account.plaid_item_id}`)
      } else {
        plaidAccounts = await getAccounts(accessToken)
        plaidDataCache.set(account.plaid_item_id, plaidAccounts)
        console.log(`Found ${plaidAccounts.length} accounts from Plaid for item ${account.plaid_item_id}`)
      }
        
      // Update account information
      const plaidAccount = plaidAccounts.find(acc => acc.account_id === account.plaid_account_id)
       
      if (plaidAccount) {
        const updateData: any = {
          name: plaidAccount.name,
          type: plaidAccount.type,
          subtype: plaidAccount.subtype,
          mask: plaidAccount.mask,
        }
        
        // Add balance information from plaidAccount (getAccounts already includes balances)
        if (plaidAccount.balances) {
          updateData.balance = plaidAccount.balances.current
          updateData.available_balance = plaidAccount.balances.available || plaidAccount.balances.current
          updateData.currency = plaidAccount.balances.iso_currency_code || 'USD'
        }
        
        updateData.updated_at = new Date()
        await bankAccountsCollection.updateOne(
          { _id: account._id },
          { $set: updateData }
        )
      }
      
      // Determine sync strategy
      let transactions: any[]
      let newCursor: string | undefined
      
      if (!account.initial_sync_complete) {
        // Initial sync: Request historical data refresh first
        console.log(`Initial sync for account ${account.name} - requesting historical data refresh`)
        try {
          await refreshTransactions(accessToken)
          console.log(`Historical refresh triggered for ${account.name}`)
        } catch (refreshError) {
          console.log(`Note: Historical refresh may not be available yet: ${refreshError}`)
        }
        
        // Use Transactions Sync API to get available historical data
        console.log(`Fetching transactions for ${account.name} using Transactions Sync API`)
        
        const syncResult = await getAllTransactionsSync(
          accessToken,
          account.sync_cursor || undefined,
          50000 // Allow up to 50k transactions for full history
        )
        
        transactions = syncResult.transactions
        newCursor = syncResult.cursor
        
        console.log(`Found ${transactions.length} transactions from Plaid Sync API for account ${account.name}`)
        
        // OPTIONAL: Try to fetch extended historical data beyond 24 months using /transactions/get
        // Note: This depends on what the financial institution provides
        const oldestDate = transactions.length > 0 
          ? transactions.reduce((oldest, t) => {
              const tDate = new Date(t.date)
              return tDate < oldest ? tDate : oldest
            }, new Date(transactions[0].date))
          : new Date()
        
        // If we got data, try to fetch more going back up to 8 years
        const eightYearsAgo = new Date()
        eightYearsAgo.setFullYear(eightYearsAgo.getFullYear() - 8)
        
        if (oldestDate > eightYearsAgo) {
          console.log(`Attempting to fetch extended historical data from ${eightYearsAgo.toISOString().split('T')[0]} to ${oldestDate.toISOString().split('T')[0]}`)
          try {
            const historicalTxns = await getTransactions(
              accessToken,
              eightYearsAgo.toISOString().split('T')[0],
              oldestDate.toISOString().split('T')[0],
              { maxTransactions: 50000 }
            )
            console.log(`Found ${historicalTxns.length} additional historical transactions`)
            transactions = [...transactions, ...historicalTxns]
          } catch (histError) {
            console.log(`Could not fetch extended historical data: ${histError}`)
          }
        }
      } else {
        // Incremental sync: Use Transactions Sync API with cursor for new transactions
        console.log(`Incremental sync for account ${account.name} - using cursor: ${account.sync_cursor || 'none'}`)
        
        const syncResult = await getAllTransactionsSync(
          accessToken,
          account.sync_cursor || undefined,
          5000 // Lower limit for incremental syncs
        )
        
        transactions = syncResult.transactions
        newCursor = syncResult.cursor
        
        console.log(`Found ${transactions.length} new transactions from Plaid Sync API for account ${account.name}`)
      }
      
      // Store transactions
      let newTransactionsCount = 0
      for (const transaction of transactions) {
        try {
          // Check if transaction already exists
          const existingTransaction = await transactionsCollection.findOne({
            plaid_transaction_id: transaction.transaction_id,
          })
          
          if (!existingTransaction) {
            const now = new Date()
            const txnDoc: InsertTransaction = {
              account_id: account._id,
              plaid_transaction_id: transaction.transaction_id,
              name: transaction.name,
              amount: transaction.amount,
              currency: transaction.iso_currency_code || 'USD',
              category: transaction.category ? transaction.category.join(', ') : 'Uncategorized',
              date: new Date(transaction.date),
              pending: transaction.pending,
              created_at: now,
              updated_at: now,
            }
            await transactionsCollection.insertOne(txnDoc)
            newTransactionsCount++
          }
        } catch (transactionError) {
          console.error(`Error processing transaction ${transaction.transaction_id}:`, transactionError)
          // Continue with next transaction even if one fails
          continue
        }
      }
      
      console.log(`Stored ${newTransactionsCount} new transactions for account ${account.name}`)
      
      // Find earliest transaction date
      const earliestTransaction = transactions.length > 0
        ? transactions.reduce((earliest, t) => {
            const tDate = new Date(t.date)
            return tDate < earliest ? tDate : earliest
          }, new Date(transactions[0].date))
        : null
      
      // Get total transaction count for this account
      const totalCount = await transactionsCollection.countDocuments({ account_id: account._id })
      
      // Update sync tracking
      await bankAccountsCollection.updateOne(
        { _id: account._id },
        {
          $set: {
            last_transaction_sync: new Date(),
            initial_sync_complete: true,
            earliest_transaction: earliestTransaction || account.earliest_transaction,
            total_transactions: totalCount,
            sync_cursor: newCursor, // Save cursor for next incremental sync
            updated_at: new Date(),
          },
        }
      )
      
      // Update sync stats
      syncStats.accountsSynced++
      syncStats.totalTransactions += transactions.length
      syncStats.newTransactions += newTransactionsCount
    }
    
    console.log('Sync completed:', syncStats)
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Sync completed successfully',
        data: syncStats,
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Sync error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Sync failed' },
      { status: 500 }
    )
  }
}
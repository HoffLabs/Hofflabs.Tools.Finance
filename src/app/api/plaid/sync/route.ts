import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getAccounts, getTransactions, getAllTransactionsSync, refreshTransactions } from '@/lib/plaid/client'
import { getDb, generateId, now } from '@/lib/db/client'
import { decryptData } from '@/lib/crypto/encryption'
import type { BankAccount, Transaction } from '@/lib/db/types'

export async function POST() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const masterKey = process.env.MASTER_ENCRYPTION_KEY
    if (!masterKey) {
      throw new Error('Master encryption key not configured')
    }
    
    const db = await getDb()
    
    const bankAccounts = await db.prepare(
      'SELECT * FROM bank_accounts WHERE user_id = ?'
    ).bind(userId).all<BankAccount>()
    
    if (bankAccounts.results.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No accounts to sync' },
        { status: 200 }
      )
    }
    
    const plaidDataCache = new Map<string, any[]>()
    const syncStats = {
      totalAccounts: bankAccounts.results.length,
      accountsSynced: 0,
      totalTransactions: 0,
      newTransactions: 0,
    }
    
    for (const account of bankAccounts.results) {
      const accessToken = await decryptData(account.plaid_access_token, masterKey)
      
      // Cache Plaid data per item
      let plaidAccounts: any[]
      if (plaidDataCache.has(account.plaid_item_id)) {
        plaidAccounts = plaidDataCache.get(account.plaid_item_id)!
      } else {
        plaidAccounts = await getAccounts(accessToken)
        plaidDataCache.set(account.plaid_item_id, plaidAccounts)
      }
        
      const plaidAccount = plaidAccounts.find(acc => acc.account_id === account.plaid_account_id)
       
      if (plaidAccount) {
        const updateFields: Record<string, any> = {
          name: plaidAccount.name,
          type: plaidAccount.type,
          subtype: plaidAccount.subtype,
          mask: plaidAccount.mask,
        }
        
        if (plaidAccount.balances) {
          updateFields.balance = plaidAccount.balances.current
          updateFields.available_balance = plaidAccount.balances.available || plaidAccount.balances.current
          updateFields.currency = plaidAccount.balances.iso_currency_code || 'USD'
        }
        
        await db.prepare(
          `UPDATE bank_accounts SET name = ?, type = ?, subtype = ?, mask = ?, balance = ?, available_balance = ?, currency = ?, updated_at = ? WHERE id = ?`
        ).bind(
          updateFields.name, updateFields.type, updateFields.subtype, updateFields.mask,
          updateFields.balance ?? account.balance, updateFields.available_balance ?? account.available_balance,
          updateFields.currency ?? account.currency, now(), account.id
        ).run()
      }
      
      // Determine sync strategy
      let transactions: any[]
      let newCursor: string | undefined
      
      if (!account.initial_sync_complete) {
        console.log(`Initial sync for account ${account.name}`)
        try {
          await refreshTransactions(accessToken)
        } catch (refreshError) {
          console.log(`Note: Historical refresh may not be available yet: ${refreshError}`)
        }
        
        const syncResult = await getAllTransactionsSync(
          accessToken,
          account.sync_cursor || undefined,
          50000
        )
        
        transactions = syncResult.transactions
        newCursor = syncResult.cursor
        
        // Try extended historical data
        const oldestDate = transactions.length > 0 
          ? transactions.reduce((oldest: Date, t: any) => {
              const tDate = new Date(t.date)
              return tDate < oldest ? tDate : oldest
            }, new Date(transactions[0].date))
          : new Date()
        
        const eightYearsAgo = new Date()
        eightYearsAgo.setFullYear(eightYearsAgo.getFullYear() - 8)
        
        if (oldestDate > eightYearsAgo) {
          try {
            const historicalTxns = await getTransactions(
              accessToken,
              eightYearsAgo.toISOString().split('T')[0],
              oldestDate.toISOString().split('T')[0],
              { maxTransactions: 50000 }
            )
            transactions = [...transactions, ...historicalTxns]
          } catch (histError) {
            console.log(`Could not fetch extended historical data: ${histError}`)
          }
        }
      } else {
        const syncResult = await getAllTransactionsSync(
          accessToken,
          account.sync_cursor || undefined,
          5000
        )
        
        transactions = syncResult.transactions
        newCursor = syncResult.cursor
      }
      
      // Store transactions
      let newTransactionsCount = 0
      for (const transaction of transactions) {
        try {
          const existing = await db.prepare(
            'SELECT id FROM transactions WHERE plaid_transaction_id = ?'
          ).bind(transaction.transaction_id).first<Transaction>()
          
          if (!existing) {
            const timestamp = now()
            await db.prepare(
              `INSERT INTO transactions (id, account_id, plaid_transaction_id, name, amount, currency, category, date, pending, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              generateId(), account.id, transaction.transaction_id,
              transaction.name, transaction.amount,
              transaction.iso_currency_code || 'USD',
              transaction.category ? transaction.category.join(', ') : 'Uncategorized',
              transaction.date, transaction.pending ? 1 : 0,
              timestamp, timestamp
            ).run()
            newTransactionsCount++
          }
        } catch (transactionError) {
          console.error(`Error processing transaction ${transaction.transaction_id}:`, transactionError)
          continue
        }
      }
      
      // Get earliest transaction and total count
      const earliestResult = transactions.length > 0
        ? transactions.reduce((earliest: string, t: any) => t.date < earliest ? t.date : earliest, transactions[0].date)
        : null
      
      const totalCount = await db.prepare(
        'SELECT COUNT(*) as count FROM transactions WHERE account_id = ?'
      ).bind(account.id).first<{ count: number }>()
      
      // Update sync tracking
      await db.prepare(
        `UPDATE bank_accounts SET last_transaction_sync = ?, initial_sync_complete = 1, earliest_transaction = ?, total_transactions = ?, sync_cursor = ?, updated_at = ? WHERE id = ?`
      ).bind(
        now(),
        earliestResult || account.earliest_transaction,
        totalCount?.count || 0,
        newCursor || null,
        now(),
        account.id
      ).run()
      
      syncStats.accountsSynced++
      syncStats.totalTransactions += transactions.length
      syncStats.newTransactions += newTransactionsCount
    }
    
    return NextResponse.json(
      { success: true, message: 'Sync completed successfully', data: syncStats },
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

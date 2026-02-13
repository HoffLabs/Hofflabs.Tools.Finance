import { getBankAccountsCollection, getTransactionsCollection, disconnectFromDatabase } from '../src/lib/db/client'

async function checkSyncStatus() {
  try {
    console.log('Checking sync status for all accounts...\n')
    
    const bankAccounts = await getBankAccountsCollection()
    const transactions = await getTransactionsCollection()
    
    const accounts = await bankAccounts.find({}).toArray()
    
    console.log(`Found ${accounts.length} accounts\n`)
    
    for (const account of accounts) {
      // Get actual transaction count for this account
      const actualCount = await transactions.countDocuments({ account_id: account._id })
      
      console.log(`Account: ${account.name}`)
      console.log(`  ID: ${account._id.toString()}`)
      console.log(`  Initial Sync Complete: ${account.initial_sync_complete}`)
      console.log(`  Last Sync: ${account.last_transaction_sync?.toISOString() || 'Never'}`)
      console.log(`  Earliest Transaction: ${account.earliest_transaction?.toISOString() || 'N/A'}`)
      console.log(`  Stored Transaction Count (field): ${account.total_transactions}`)
      console.log(`  Actual Transaction Count (database): ${actualCount}`)
      console.log('')
    }
    
    const totalTransactions = await transactions.countDocuments({})
    console.log(`Total transactions in database: ${totalTransactions}`)
    
  } catch (error) {
    console.error('Error checking sync status:', error)
  } finally {
    await disconnectFromDatabase()
  }
}

checkSyncStatus()

import { getBankAccountsCollection, getTransactionsCollection, disconnectFromDatabase } from '../src/lib/db/client'

async function resetSync() {
  try {
    console.log('Resetting sync status for all accounts...')
    
    const bankAccounts = await getBankAccountsCollection()
    // const transactions = await getTransactionsCollection()
    
    // Reset all accounts to force a fresh sync
    const result = await bankAccounts.updateMany(
      {},
      {
        $set: {
          initial_sync_complete: false,
          last_transaction_sync: null,
          sync_cursor: null,
          earliest_transaction: null,
          total_transactions: 0,
          updated_at: new Date(),
        },
      }
    )
    
    console.log(`Reset ${result.modifiedCount} accounts`)
    
    // Optionally, you can also clear all transactions to start fresh
    // Uncomment the following lines if you want to delete existing transactions
    // const deletedTransactions = await transactions.deleteMany({})
    // console.log(`Deleted ${deletedTransactions.deletedCount} transactions`)
    
    console.log('Sync reset complete. Run the sync endpoint to fetch all transactions.')
    
  } catch (error) {
    console.error('Error resetting sync:', error)
  } finally {
    await disconnectFromDatabase()
  }
}

resetSync()

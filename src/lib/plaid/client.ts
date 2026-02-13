// Plaid API client
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

let plaidClient: PlaidApi | null = null

export function getPlaidClient(): PlaidApi {
  if (!plaidClient) {
    const configuration = new Configuration({
      basePath: getPlaidBasePath(),
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
          'Plaid-Version': '2020-09-14',
        },
      },
    })
    
    plaidClient = new PlaidApi(configuration)
  }
  
  return plaidClient
}

function getPlaidBasePath(): string {
  const env = process.env.PLAID_ENV || 'sandbox'
  
  switch (env) {
    case 'development':
      return PlaidEnvironments.development
    case 'sandbox':
      return PlaidEnvironments.sandbox
    case 'production':
      return PlaidEnvironments.production
    default:
      return PlaidEnvironments.sandbox
  }
}

export async function createLinkToken(userId: string): Promise<string> {
  const client = getPlaidClient()
  
  try {
    const request: any = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Finance Monitor',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
      transactions: {
        days_requested: 730, // Request maximum 24 months (2 years) of transaction history
      },
    }
    
    const response = await client.linkTokenCreate(request)
    return response.data.link_token
    
  } catch (error) {
    console.error('Error creating Plaid link token:', error)
    throw new Error('Failed to create Plaid link token')
  }
}

export async function exchangePublicToken(publicToken: string): Promise<{
  accessToken: string
  itemId: string
}> {
  const client = getPlaidClient()
  
  try {
    const response = await client.itemPublicTokenExchange({
      public_token: publicToken,
    })
    
    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    }
    
  } catch (error) {
    console.error('Error exchanging public token:', error)
    throw new Error('Failed to exchange public token')
  }
}

export async function getAccounts(accessToken: string): Promise<any[]> {
  const client = getPlaidClient()
  
  try {
    const response = await client.accountsGet({
      access_token: accessToken,
    })
    
    return response.data.accounts
    
  } catch (error) {
    console.error('Error getting accounts:', error)
    throw new Error('Failed to get accounts')
  }
}

export async function getTransactions(
  accessToken: string, 
  startDate: string, 
  endDate: string,
  options?: { maxTransactions?: number }
): Promise<any[]> {
  const client = getPlaidClient()
  const allTransactions: any[] = []
  const maxTransactions = options?.maxTransactions || 10000 // Safety limit
  
  try {
    let offset = 0
    let hasMore = true
    const count = 500 // Max allowed per request
    
    while (hasMore && allTransactions.length < maxTransactions) {
      const response = await client.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: {
          count,
          offset,
        },
      })
      
      const transactions = response.data.transactions
      allTransactions.push(...transactions)
      
      // Check if we've fetched all transactions
      const totalTransactions = response.data.total_transactions
      hasMore = allTransactions.length < totalTransactions
      offset += transactions.length
      
      console.log(`Fetched ${allTransactions.length} of ${totalTransactions} transactions (offset: ${offset})`)
      
      // Add small delay to avoid rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return allTransactions
  
  } catch (error) {
    console.error('Error getting transactions:', error)
    throw new Error('Failed to get transactions')
  }
}

// New Transactions Sync API - provides better access to historical data
export async function syncTransactions(
  accessToken: string,
  cursor?: string
): Promise<{ transactions: any[], cursor: string, hasMore: boolean }> {
  const client = getPlaidClient()
  
  try {
    const request: any = {
      access_token: accessToken,
    }
    
    // Include cursor if provided for pagination
    if (cursor) {
      request.cursor = cursor
    }
    
    const response = await client.transactionsSync(request)
    
    return {
      transactions: response.data.added,
      cursor: response.data.next_cursor,
      hasMore: response.data.has_more,
    }
  } catch (error) {
    console.error('Error syncing transactions:', error)
    throw new Error('Failed to sync transactions')
  }
}

// Fetch all historical transactions using Transactions Sync API
export async function getAllTransactionsSync(
  accessToken: string,
  cursor?: string,
  maxTransactions?: number
): Promise<{ transactions: any[], cursor: string }> {
  const allTransactions: any[] = []
  let currentCursor = cursor
  let hasMore = true
  const limit = maxTransactions || 50000 // Much higher limit for historical data
  
  try {
    while (hasMore && allTransactions.length < limit) {
      const { transactions, cursor: nextCursor, hasMore: more } = await syncTransactions(
        accessToken,
        currentCursor
      )
      
      allTransactions.push(...transactions)
      currentCursor = nextCursor
      hasMore = more
      
      console.log(`Synced ${transactions.length} transactions (total: ${allTransactions.length}, hasMore: ${hasMore})`)
      
      // Small delay to avoid rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`Completed sync: ${allTransactions.length} total transactions`)
    
    return {
      transactions: allTransactions,
      cursor: currentCursor || '',
    }
  } catch (error) {
    console.error('Error getting all transactions via sync:', error)
    throw new Error('Failed to get all transactions via sync')
  }
}

export async function getBalances(accessToken: string): Promise<any[]> {
  const client = getPlaidClient()
  
  try {
    // Use accountsGet instead of accountsBalanceGet since balance product
    // requires additional approval for production use
    const response = await client.accountsGet({
      access_token: accessToken,
    })
  
    return response.data.accounts
  
  } catch (error) {
    console.error('Error getting account balances:', error)
    throw new Error('Failed to get account balances')
  }
}

// Trigger a refresh to request historical transaction data
export async function refreshTransactions(accessToken: string): Promise<void> {
  const client = getPlaidClient()
  
  try {
    await client.transactionsRefresh({
      access_token: accessToken,
    })
    
    console.log('Successfully triggered transaction refresh')
  } catch (error) {
    console.error('Error refreshing transactions:', error)
    throw new Error('Failed to refresh transactions')
  }
}

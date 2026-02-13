import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCurrentUserId } from '@/lib/auth/utils'
import { exchangePublicToken, getAccounts } from '@/lib/plaid/client'
import { getBankAccountsCollection } from '@/lib/db/client'
import { encryptData } from '@/lib/crypto/encryption'
import { InsertBankAccount } from '@/lib/db/types'

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
   
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
   
    const { public_token } = await request.json()
   
    if (!public_token) {
      return NextResponse.json(
        { success: false, error: 'Public token is required' },
        { status: 400 }
      )
    }
   
    // Exchange public token for access token
    const { accessToken, itemId } = await exchangePublicToken(public_token)
   
    // Get master key from environment
    const masterKey = process.env.MASTER_ENCRYPTION_KEY
    if (!masterKey) {
      throw new Error('Master encryption key not configured')
    }
   
    // Encrypt the access token
    const encryptedAccessToken = await encryptData(accessToken, masterKey)
   
    // Get all accounts from Plaid
    const plaidAccounts = await getAccounts(accessToken)
    console.log(`Found ${plaidAccounts.length} accounts from Plaid:`)
    plaidAccounts.forEach(account => {
      console.log(`- Account: ${account.name} (${account.type}/${account.subtype})`)
    })
    
    const bankAccounts = await getBankAccountsCollection()
    const now = new Date()
    
    // Store each account in database with balance info
    for (const plaidAccount of plaidAccounts) {
      const accountDoc: InsertBankAccount = {
        user_id: new ObjectId(userId),
        plaid_item_id: itemId,
        plaid_account_id: plaidAccount.account_id,
        plaid_access_token: encryptedAccessToken,
        name: plaidAccount.name,
        type: plaidAccount.type,
        subtype: plaidAccount.subtype,
        mask: plaidAccount.mask || '****',
        balance: plaidAccount.balances?.current || 0,
        available_balance: plaidAccount.balances?.available || plaidAccount.balances?.current || 0,
        currency: plaidAccount.balances?.iso_currency_code || 'USD',
        last_transaction_sync: null,
        initial_sync_complete: false,
        sync_cursor: null,
        earliest_transaction: null,
        total_transactions: 0,
        created_at: now,
        updated_at: now,
      }
      await bankAccounts.insertOne(accountDoc)
    }
   
    return NextResponse.json(
      { success: true, message: 'Accounts linked successfully' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Error exchanging public token:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to exchange public token' },
      { status: 500 }
    )
  }
}

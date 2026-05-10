import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { exchangePublicToken, getAccounts } from '@/lib/plaid/client'
import { getDb, generateId, now } from '@/lib/db/client'
import { encryptData } from '@/lib/crypto/encryption'

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
   
    const { accessToken, itemId } = await exchangePublicToken(public_token)
   
    const masterKey = process.env.MASTER_ENCRYPTION_KEY
    if (!masterKey) {
      throw new Error('Master encryption key not configured')
    }
   
    const encryptedAccessToken = await encryptData(accessToken, masterKey)
    const plaidAccounts = await getAccounts(accessToken)
    
    const db = await getDb()
    const timestamp = now()
    
    for (const plaidAccount of plaidAccounts) {
      await db.prepare(
        `INSERT INTO bank_accounts (id, user_id, plaid_item_id, plaid_account_id, plaid_access_token, name, type, subtype, mask, balance, available_balance, currency, last_transaction_sync, initial_sync_complete, sync_cursor, earliest_transaction, total_transactions, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, NULL, NULL, 0, ?, ?)`
      ).bind(
        generateId(), userId, itemId, plaidAccount.account_id, encryptedAccessToken,
        plaidAccount.name, plaidAccount.type, plaidAccount.subtype,
        plaidAccount.mask || '****',
        plaidAccount.balances?.current || 0,
        plaidAccount.balances?.available || plaidAccount.balances?.current || 0,
        plaidAccount.balances?.iso_currency_code || 'USD',
        timestamp, timestamp
      ).run()
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

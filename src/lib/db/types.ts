import { ObjectId, WithoutId } from 'mongodb'

// User collection
export interface User {
  _id?: ObjectId
  username: string
  password_hash: string
  salt: string
  encryption_key: string
  two_factor_enabled: boolean
  two_factor_secret: string | null
  zip_code?: string
  created_at: Date
  updated_at: Date
}

// BankAccount collection
export interface BankAccount {
  _id?: ObjectId
  user_id: ObjectId
  plaid_item_id: string
  plaid_account_id: string
  plaid_access_token: string
  name: string
  type: string
  subtype: string
  mask: string
  balance: number | null
  available_balance: number | null
  currency: string | null
  last_transaction_sync: Date | null
  initial_sync_complete: boolean
  sync_cursor: string | null
  earliest_transaction: Date | null
  total_transactions: number
  created_at: Date
  updated_at: Date
}

// Transaction collection
export interface Transaction {
  _id?: ObjectId
  account_id: ObjectId
  plaid_transaction_id: string
  name: string
  amount: number
  currency: string
  category: string
  date: Date
  pending: boolean
  created_at: Date
  updated_at: Date
}

// SyncLog collection
export interface SyncLog {
  _id?: ObjectId
  user_id: ObjectId
  account_id: ObjectId
  last_sync: Date
  status: string
  error_message: string | null
  created_at: Date
  updated_at: Date
}

// Session collection
export interface Session {
  _id?: ObjectId
  token: string
  user_id: ObjectId
  expires_at: Date
  created_at: Date
  updated_at: Date
}

// MerchantCategory collection - user-defined category overrides for merchants
export interface MerchantCategory {
  _id?: ObjectId
  user_id: ObjectId
  merchant_name: string  // Normalized merchant name (lowercase)
  category: string
  created_at: Date
  updated_at: Date
}

// For inserting new documents (without _id)
export type InsertUser = WithoutId<User>
export type InsertBankAccount = WithoutId<BankAccount>
export type InsertTransaction = WithoutId<Transaction>
export type InsertSyncLog = WithoutId<SyncLog>
export type InsertSession = WithoutId<Session>
export type InsertMerchantCategory = WithoutId<MerchantCategory>

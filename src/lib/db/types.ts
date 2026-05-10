// Paycheck deduction fields
export interface PaycheckDeductions {
  retirement?: number    // 401(k) / 403(b) monthly
  healthInsurance?: number
  hsa?: number
  dentalVision?: number
  otherPreTax?: number
}

// User preferences
export interface UserPreferences {
  showRates?: boolean
  showCharts?: boolean
  dashboardSections?: {
    charts?: boolean
    accounts?: boolean
    recentTransactions?: boolean
  }
  ai?: {
    enabled?: boolean
    apiUrl?: string
    apiKey?: string  // encrypted at rest
    model?: string
  }
  // Income & payroll
  payType?: 'salary' | 'hourly'
  yearlyIncome?: number
  hourlyRate?: number
  hoursPerWeek?: number
  payFrequency?: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
  annualBonus?: number
  monthlyIncome?: number
  age?: number
  nextPayDate?: string
  payDay?: number
  // Deductions
  deductions?: PaycheckDeductions
  // Branding
  branding?: {
    appName?: string
    logoUrl?: string
  }
}

// User table
export interface User {
  id: string
  account_hash: string
  hash_version: number
  encryption_key: string
  two_factor_enabled: number // SQLite boolean (0/1)
  two_factor_secret: string | null
  zip_code: string | null
  preferences: string | null // JSON string
  username: string | null
  created_at: string
  updated_at: string
  last_accessed: string | null
}

// BankAccount table
export interface BankAccount {
  id: string
  user_id: string
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
  last_transaction_sync: string | null
  initial_sync_complete: number // SQLite boolean (0/1)
  sync_cursor: string | null
  earliest_transaction: string | null
  total_transactions: number
  created_at: string
  updated_at: string
}

// Transaction table
export interface Transaction {
  id: string
  account_id: string
  plaid_transaction_id: string
  name: string
  amount: number
  currency: string
  category: string
  date: string
  pending: number // SQLite boolean (0/1)
  created_at: string
  updated_at: string
}

// SyncLog table
export interface SyncLog {
  id: string
  user_id: string
  account_id: string
  last_sync: string
  status: string
  error_message: string | null
  created_at: string
  updated_at: string
}

// Session table
export interface Session {
  id: string
  token: string
  user_id: string
  expires_at: string
  created_at: string
  updated_at: string
}

// MerchantCategory table
export interface MerchantCategory {
  id: string
  user_id: string
  merchant_name: string
  category: string
  created_at: string
  updated_at: string
}

// AI category cache
export interface AiCategory {
  id: string
  merchant_name: string
  category: string
  created_at: string
}

// AI daily summary cache
export interface AiSummary {
  id: string
  user_id: string
  date: string
  summary: string
  created_at: string
}

import { MongoClient, Db, Collection } from 'mongodb'
import { User, BankAccount, Transaction, SyncLog, Session, MerchantCategory } from './types'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the connection
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // In production mode, create a new client for each request
  client = new MongoClient(MONGODB_URI)
  clientPromise = client.connect()
}

export { clientPromise }

// Helper to get the database instance
export async function getDb(): Promise<Db> {
  const client = await clientPromise
  return client.db()
}

// Collection accessors
export async function getUsersCollection(): Promise<Collection<User>> {
  const db = await getDb()
  return db.collection<User>('users')
}

export async function getBankAccountsCollection(): Promise<Collection<BankAccount>> {
  const db = await getDb()
  return db.collection<BankAccount>('bankAccounts')
}

export async function getTransactionsCollection(): Promise<Collection<Transaction>> {
  const db = await getDb()
  return db.collection<Transaction>('transactions')
}

export async function getSyncLogsCollection(): Promise<Collection<SyncLog>> {
  const db = await getDb()
  return db.collection<SyncLog>('syncLogs')
}

export async function getSessionsCollection(): Promise<Collection<Session>> {
  const db = await getDb()
  return db.collection<Session>('sessions')
}

export async function getMerchantCategoriesCollection(): Promise<Collection<MerchantCategory>> {
  const db = await getDb()
  return db.collection<MerchantCategory>('merchantCategories')
}

export async function connectToDatabase() {
  try {
    await clientPromise
    console.log('Database connected successfully')
  } catch (error) {
    console.error('Database connection error:', error)
    throw error
  }
}

export async function disconnectFromDatabase() {
  try {
    const client = await clientPromise
    await client.close()
    console.log('Database disconnected successfully')
  } catch (error) {
    console.error('Database disconnection error:', error)
    throw error
  }
}

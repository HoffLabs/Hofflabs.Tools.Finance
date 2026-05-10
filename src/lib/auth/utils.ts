import { getDb, generateId, now as nowFn } from '../db/client'
import { generateUserKey, encryptUserKey } from '../crypto/encryption'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'
import type { Session, User } from '../db/types'

// Session management
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'finance_monitor_session'
const SESSION_COOKIE_MAX_AGE = 86400 // 24 hours
const SESSION_EXPIRATION_HOURS = 24
const ACCOUNT_HASH_SALT = process.env.ACCOUNT_HASH_SALT || 'hofflabs-v1-salt'

// ── Luhn helpers ──

export function luhnCheckDigit(num: string): number {
  let sum = 0
  for (let i = num.length - 1; i >= 0; i--) {
    let d = parseInt(num[i], 10)
    if ((num.length - i) % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return (10 - (sum % 10)) % 10
}

export function isValidLuhn(num: string): boolean {
  if (!/^\d+$/.test(num)) return false
  let sum = 0
  let alt = false
  for (let i = num.length - 1; i >= 0; i--) {
    let d = parseInt(num[i], 10)
    if (alt) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

// ── Account number generation & hashing ──

export function generateAccountNumber(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  let num = BigInt(0)
  for (let i = 0; i < bytes.length; i++) {
    num = (num << BigInt(8)) | BigInt(bytes[i])
  }
  const min15 = BigInt('100000000000000')
  const max15 = BigInt('999999999999999')
  const base = (num % (max15 - min15 + BigInt(1)) + min15).toString()
  const check = luhnCheckDigit(base)
  return `${base}${check}`
}

export function hashAccountNumber(accountId: string, version = 1): string {
  return createHash('sha256')
    .update(`${ACCOUNT_HASH_SALT}:v${version}:${accountId}`)
    .digest('hex')
}

// ── Session management ──

export async function createSession(userId: string): Promise<void> {
  const sessionToken = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRATION_HOURS)

  const db = await getDb()
  const timestamp = nowFn()

  await db.prepare(
    `INSERT INTO sessions (id, token, user_id, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(generateId(), sessionToken, userId, expiresAt.toISOString(), timestamp, timestamp).run()

  ;(await cookies()).set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function destroySession(): Promise<void> {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (sessionToken) {
    const db = await getDb()
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(sessionToken).run()
  }
  ;(await cookies()).delete(SESSION_COOKIE_NAME)
}

export async function getCurrentUserId(): Promise<string | null> {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!sessionToken) return null

  const db = await getDb()
  const session = await db.prepare(
    'SELECT * FROM sessions WHERE token = ?'
  ).bind(sessionToken).first<Session>()
  if (!session) return null

  if (new Date(session.expires_at) < new Date()) {
    await destroySession()
    return null
  }

  return session.user_id
}

// ── Account creation (replaces registerUser) ──

export async function generateAccount(): Promise<{ id: string; accountId: string }> {
  const accountId = generateAccountNumber()
  const accountHash = hashAccountNumber(accountId, 1)

  const userKey = await generateUserKey()
  const masterKey = process.env.MASTER_ENCRYPTION_KEY
  if (!masterKey) throw new Error('Master encryption key not configured')
  const encryptedUserKey = await encryptUserKey(userKey, masterKey)

  const db = await getDb()
  const id = generateId()
  const timestamp = nowFn()

  await db.prepare(
    `INSERT INTO users (id, account_hash, hash_version, encryption_key, two_factor_enabled, two_factor_secret, created_at, updated_at, last_accessed)
     VALUES (?, ?, 1, ?, 0, NULL, ?, ?, ?)`
  ).bind(id, accountHash, encryptedUserKey, timestamp, timestamp, timestamp).run()

  return { id, accountId }
}

// ── Login (replaces authenticateUser) ──

export async function loginWithAccountId(accountId: string): Promise<{ id: string; two_factor_enabled: boolean }> {
  if (!/^\d{16}$/.test(accountId) || !isValidLuhn(accountId)) {
    throw new Error('Invalid account number')
  }

  const accountHash = hashAccountNumber(accountId, 1)
  const db = await getDb()
  const user = await db.prepare(
    'SELECT id, two_factor_enabled FROM users WHERE account_hash = ?'
  ).bind(accountHash).first<User>()

  if (!user) throw new Error('Invalid account number')

  const timestamp = nowFn()
  await db.prepare(
    'UPDATE users SET last_accessed = ?, updated_at = ? WHERE id = ?'
  ).bind(timestamp, timestamp, user.id).run()

  return {
    id: user.id,
    two_factor_enabled: !!user.two_factor_enabled,
  }
}

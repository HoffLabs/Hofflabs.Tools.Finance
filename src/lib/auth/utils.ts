import { ObjectId } from 'mongodb'
import { getUsersCollection, getSessionsCollection } from '../db/client'
import { generateSecurePasswordHash, validatePasswordStrength, verifyPassword } from '../crypto/password'
import { generateUserKey, encryptUserKey } from '../crypto/encryption'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { InsertSession, InsertUser } from '../db/types'

// Session management
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'finance_monitor_session'
const SESSION_COOKIE_MAX_AGE = 86400 // 24 hours
const SESSION_EXPIRATION_HOURS = 24

export async function createSession(userId: string): Promise<void> {
  const sessionToken = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRATION_HOURS)
  
  const sessions = await getSessionsCollection()
  const now = new Date()
  
  const sessionDoc: InsertSession = {
    token: sessionToken,
    user_id: new ObjectId(userId),
    expires_at: expiresAt,
    created_at: now,
    updated_at: now,
  }
  
  await sessions.insertOne(sessionDoc)
  
  // Set session cookie
  const cookieOptions = {
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: '/',
  }
  
  cookies().set(cookieOptions)
}

export async function destroySession(): Promise<void> {
  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value
  
  if (sessionToken) {
    const sessions = await getSessionsCollection()
    await sessions.deleteOne({ token: sessionToken })
  }
  
  // Delete session cookie
  cookies().delete(SESSION_COOKIE_NAME)
}

export async function getCurrentUserId(): Promise<string | null> {
  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value
  
  if (!sessionToken) {
    return null
  }
  
  const sessions = await getSessionsCollection()
  const session = await sessions.findOne({ token: sessionToken })
  
  if (!session) {
    return null
  }
  
  // Check if session has expired
  if (new Date(session.expires_at) < new Date()) {
    await destroySession()
    return null
  }
  
  // Return the user ID associated with this session
  return session.user_id.toString()
}

export async function registerUser(username: string, password: string) {
  // Validate password strength
  const validation = validatePasswordStrength(password)
  if (!validation.valid) {
    throw new Error(validation.message || 'Invalid password')
  }
  
  // Generate secure password hash
  const { hash: passwordHash } = await generateSecurePasswordHash(password)
  
  // Generate user encryption key
  const userKey = await generateUserKey()
  
  // Get master key from environment
  const masterKey = process.env.MASTER_ENCRYPTION_KEY
  if (!masterKey) {
    throw new Error('Master encryption key not configured')
  }
  
  // Encrypt user key with master key
  const encryptedUserKey = await encryptUserKey(userKey, masterKey)
  
  const users = await getUsersCollection()
  const now = new Date()
  
  const userDoc: InsertUser = {
    username,
    password_hash: passwordHash,
    salt: '', // Argon2 handles salt internally
    encryption_key: encryptedUserKey,
    two_factor_enabled: false,
    two_factor_secret: null,
    created_at: now,
    updated_at: now,
  }
  
  const result = await users.insertOne(userDoc)
  
  return {
    id: result.insertedId.toString(),
    ...userDoc,
  }
}

export async function authenticateUser(username: string, password: string) {
  const users = await getUsersCollection()
  const user = await users.findOne({ username })
  
  if (!user) {
    throw new Error('Invalid credentials')
  }
  
  // Verify password
  const isValid = await verifyPassword(user.password_hash, password)
  
  if (!isValid) {
    throw new Error('Invalid credentials')
  }
  
  return {
    id: user._id.toString(),
    ...user,
  }
}

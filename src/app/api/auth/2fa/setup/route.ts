import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb } from '@/lib/db/client'
import crypto from 'crypto'
import type { User } from '@/lib/db/types'

export async function POST() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const secret = crypto.randomBytes(20).toString('hex')
    
    const db = await getDb()
    const user = await db.prepare(
      'SELECT username FROM users WHERE id = ?'
    ).bind(userId).first<User>()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/FinanceMonitor:${user.username}?secret=${secret}&issuer=FinanceMonitor`
    
    return NextResponse.json(
      { success: true, secret, qrCode },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Error setting up 2FA:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to setup 2FA' },
      { status: 500 }
    )
  }
}

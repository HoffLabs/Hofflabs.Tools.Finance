import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb, now } from '@/lib/db/client'

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { code, secret } = await request.json()
    
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      )
    }
    
    const db = await getDb()
    await db.prepare(
      'UPDATE users SET two_factor_secret = ?, updated_at = ? WHERE id = ?'
    ).bind(secret, now(), userId).run()
    
    return NextResponse.json(
      { success: true, message: '2FA verification successful' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Error verifying 2FA:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify 2FA' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getUsersCollection } from '@/lib/db/client'
import crypto from 'crypto'

export async function POST() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Generate a new secret for the user
    const secret = crypto.randomBytes(20).toString('hex')
    
    // Get the user's email (or username) for the QR code
    const users = await getUsersCollection()
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { username: 1 } }
    )
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    
    // For simplicity, we'll return a mock QR code URL
    // In a real application, you would generate a proper QR code
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/FinanceMonitor:${user.username}?secret=${secret}&issuer=FinanceMonitor`
    
    return NextResponse.json(
      {
        success: true,
        secret,
        qrCode,
      },
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
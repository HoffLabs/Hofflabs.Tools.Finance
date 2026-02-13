import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getUsersCollection } from '@/lib/db/client'

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
    
    // In a real application, you would verify the code using a library like otplib
    // For simplicity, we'll assume the code is valid if it's a 6-digit number
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      )
    }
    
    // Store the secret in the user's record for future verification
    // In a real application, you would store this securely
    const users = await getUsersCollection()
    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          two_factor_secret: secret,
          updated_at: new Date(),
        },
      }
    )
    
    return NextResponse.json(
      {
        success: true,
        message: '2FA verification successful',
      },
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
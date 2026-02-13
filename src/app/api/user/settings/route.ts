import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getUsersCollection } from '@/lib/db/client'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const users = await getUsersCollection()
    
    // Get user settings
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { two_factor_enabled: 1, username: 1, zip_code: 1 } }
    )
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      {
        success: true,
        data: {
          twoFactorEnabled: user.two_factor_enabled,
          username: user.username,
          zipCode: user.zip_code || '',
        },
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Error getting user settings:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to get user settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { twoFactorEnabled, zipCode } = body
    
    const users = await getUsersCollection()
    
    // Build update object with only provided fields
    const updateFields: Record<string, any> = {
      updated_at: new Date(),
    }
    
    if (twoFactorEnabled !== undefined) {
      updateFields.two_factor_enabled = twoFactorEnabled
    }
    
    if (zipCode !== undefined) {
      // Validate zip code format (5 digits)
      if (zipCode && !/^\d{5}$/.test(zipCode)) {
        return NextResponse.json(
          { success: false, error: 'Invalid zip code format. Must be 5 digits.' },
          { status: 400 }
        )
      }
      updateFields.zip_code = zipCode
    }
    
    // Update user settings
    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: updateFields,
      }
    )
    
    return NextResponse.json(
      {
        success: true,
        data: {
          twoFactorEnabled,
          zipCode,
        },
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Error updating user settings:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to update user settings' },
      { status: 500 }
    )
  }
}

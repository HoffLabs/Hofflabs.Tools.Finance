import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { createLinkToken } from '@/lib/plaid/client'

export async function POST() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const linkToken = await createLinkToken(userId)
    
    return NextResponse.json(
      { success: true, link_token: linkToken },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Error creating link token:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to create link token' },
      { status: 500 }
    )
  }
}
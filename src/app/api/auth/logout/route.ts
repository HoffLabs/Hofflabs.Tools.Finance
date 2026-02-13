import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth/utils'

export async function POST() {
  try {
    await destroySession()
    
    return NextResponse.json(
      { success: true, message: 'Logout successful' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Logout error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
}
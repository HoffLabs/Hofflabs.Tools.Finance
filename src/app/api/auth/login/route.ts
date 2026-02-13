import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { authenticateUser, createSession } from '@/lib/auth/utils'
import { getUsersCollection } from '@/lib/db/client'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const twoFactorCode = formData.get('twoFactorCode') as string | null
    
    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      )
    }
    
    // Authenticate user
    const user = await authenticateUser(username, password)
    
    // Check if 2FA is enabled for the user
    const users = await getUsersCollection()
    const userWith2FA = await users.findOne(
      { _id: new ObjectId(user.id) },
      { projection: { two_factor_enabled: 1 } }
    )
    
    if (userWith2FA?.two_factor_enabled) {
      // If 2FA is enabled, check if the code was provided
      if (!twoFactorCode) {
        // Return a response indicating that 2FA is required
        return NextResponse.json(
          { success: false, error: 'Two-factor authentication required', requires2FA: true },
          { status: 401 }
        )
      }
      
      // In a real application, you would verify the 2FA code here
      // For simplicity, we'll assume the code is valid if it's a 6-digit number
      if (twoFactorCode.length !== 6 || !/^\d+$/.test(twoFactorCode)) {
        return NextResponse.json(
          { success: false, error: 'Invalid two-factor authentication code' },
          { status: 401 }
        )
      }
    }
    
    // Create session
    await createSession(user.id)
    
    return NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Login error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    )
  }
}
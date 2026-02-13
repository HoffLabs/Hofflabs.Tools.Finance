import { NextResponse } from 'next/server'
import { registerUser, createSession } from '@/lib/auth/utils'
import { validatePasswordStrength } from '@/lib/crypto/password'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const passwordConfirmation = formData.get('passwordConfirmation') as string
    
    // Validate input
    if (!username || !password || !passwordConfirmation) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }
    
    if (password !== passwordConfirmation) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      )
    }
    
    // Validate password strength
    const validation = validatePasswordStrength(password)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.message || 'Invalid password' },
        { status: 400 }
      )
    }
    
    // Register user
    const user = await registerUser(username, password)
    
    // Create session
    await createSession(user.id)
    
    return NextResponse.json(
      { success: true, message: 'User registered successfully' },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: 'Registration failed' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
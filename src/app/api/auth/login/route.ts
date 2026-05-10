import { NextResponse } from 'next/server'
import { loginWithAccountId, createSession } from '@/lib/auth/utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const accountId = body?.accountId?.toString()?.replace(/\s/g, '')
    const twoFactorCode = body?.twoFactorCode as string | null

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account number is required' },
        { status: 400 }
      )
    }

    // Authenticate with account number
    const user = await loginWithAccountId(accountId)

    // Check 2FA
    if (user.two_factor_enabled) {
      if (!twoFactorCode) {
        return NextResponse.json(
          { success: false, error: 'Two-factor authentication required', requires2FA: true },
          { status: 401 }
        )
      }

      if (twoFactorCode.length !== 6 || !/^\d+$/.test(twoFactorCode)) {
        return NextResponse.json(
          { success: false, error: 'Invalid two-factor authentication code' },
          { status: 401 }
        )
      }
    }

    await createSession(user.id)

    return NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Invalid account number' },
      { status: 401 }
    )
  }
}

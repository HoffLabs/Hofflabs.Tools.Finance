import { NextResponse } from 'next/server'
import { generateAccount, createSession } from '@/lib/auth/utils'

export async function POST() {
  try {
    const account = await generateAccount()

    // Create session (auto-login)
    await createSession(account.id)

    return NextResponse.json(
      { success: true, accountId: account.accountId },
      { status: 201 }
    )
  } catch (error) {
    console.error('Account generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate account' },
      { status: 500 }
    )
  }
}

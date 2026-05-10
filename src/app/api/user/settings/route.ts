import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb, now } from '@/lib/db/client'
import type { User, UserPreferences } from '@/lib/db/types'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const db = await getDb()
    const user = await db.prepare(
      'SELECT two_factor_enabled, username, zip_code, preferences FROM users WHERE id = ?'
    ).bind(userId).first<User>()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    
    const prefs: UserPreferences = user.preferences ? JSON.parse(user.preferences) : {}
    
    return NextResponse.json(
      {
        success: true,
        data: {
          twoFactorEnabled: !!user.two_factor_enabled,
          username: user.username,
          zipCode: user.zip_code || '',
          preferences: prefs,
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
    const { twoFactorEnabled, zipCode, preferences } = body
    
    const db = await getDb()
    
    // Build SET clause dynamically
    const sets: string[] = ['updated_at = ?']
    const params: any[] = [now()]
    
    if (twoFactorEnabled !== undefined) {
      sets.push('two_factor_enabled = ?')
      params.push(twoFactorEnabled ? 1 : 0)
    }
    
    if (zipCode !== undefined) {
      if (zipCode && !/^\d{5}$/.test(zipCode)) {
        return NextResponse.json(
          { success: false, error: 'Invalid zip code format. Must be 5 digits.' },
          { status: 400 }
        )
      }
      sets.push('zip_code = ?')
      params.push(zipCode)
    }

    if (preferences !== undefined) {
      const existingUser = await db.prepare(
        'SELECT preferences FROM users WHERE id = ?'
      ).bind(userId).first<User>()
      const existingPrefs: UserPreferences = existingUser?.preferences ? JSON.parse(existingUser.preferences) : {}
      const mergedPrefs = { ...existingPrefs, ...preferences }
      sets.push('preferences = ?')
      params.push(JSON.stringify(mergedPrefs))
    }
    
    params.push(userId)
    await db.prepare(
      `UPDATE users SET ${sets.join(', ')} WHERE id = ?`
    ).bind(...params).run()
    
    return NextResponse.json(
      { success: true, data: { twoFactorEnabled, zipCode } },
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

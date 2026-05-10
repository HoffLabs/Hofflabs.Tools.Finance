import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb } from '@/lib/db/client'
import { batchCategorize, AiConfig } from '@/lib/ai/categorizer'
import type { User, UserPreferences } from '@/lib/db/types'

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { names } = await request.json()
    if (!names || !Array.isArray(names)) {
      return NextResponse.json({ success: false, error: 'names array required' }, { status: 400 })
    }

    const db = await getDb()
    const user = await db.prepare('SELECT preferences FROM users WHERE id = ?').bind(userId).first<User>()
    const prefs: UserPreferences = user?.preferences ? JSON.parse(user.preferences) : {}
    const aiPrefs = prefs.ai
    const aiConfig: AiConfig | null = aiPrefs?.enabled ? {
      enabled: true,
      apiUrl: aiPrefs.apiUrl || '',
      apiKey: aiPrefs.apiKey || '',
      model: aiPrefs.model || 'gpt-4o-mini',
    } : null

    const results = await batchCategorize(names, aiConfig)

    return NextResponse.json({ success: true, data: results })
  } catch (error: any) {
    console.error('AI categorize error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

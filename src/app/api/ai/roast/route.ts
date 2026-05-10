import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb } from '@/lib/db/client'
import type { User, UserPreferences } from '@/lib/db/types'

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { totalSpent, topCategory, transactionCount, monthlyIncome, totalDebt } = body

    const db = await getDb()
    const user = await db.prepare('SELECT preferences FROM users WHERE id = ?').bind(userId).first<User>()
    const prefs: UserPreferences = user?.preferences ? JSON.parse(user.preferences) : {}
    const aiPrefs = prefs.ai
    if (!aiPrefs?.enabled) {
      // Return default roasts if AI is not enabled
      return NextResponse.json({
        success: true,
        data: {
          roast: getDefaultRoast(totalSpent, topCategory, totalDebt)
        }
      })
    }

    // Call LiteLLM API
    const apiUrl = aiPrefs.apiUrl || 'https://litellm-prod.concluda.ai'
    const apiKey = aiPrefs.apiKey || ''
    const model = aiPrefs.model || 'gpt-4o-mini'

    const prompt = `You are a sarcastic financial advisor roasting someone's spending habits. Be funny but not mean.

Spending data:
- Total spent this month: $${totalSpent}
- Top spending category: ${topCategory}
- Number of transactions: ${transactionCount}
${monthlyIncome ? `- Monthly income: $${monthlyIncome}` : ''}
${totalDebt ? `- Total debt: $${totalDebt}` : ''}

Generate ONE short, funny roast comment (max 15 words) about their spending. Use emojis sparingly.`

    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a witty financial roast comedian.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 50,
        temperature: 0.9
      })
    })

    if (!response.ok) {
      throw new Error('AI API request failed')
    }

    const data = await response.json()
    const roast = data.choices?.[0]?.message?.content?.trim() || getDefaultRoast(totalSpent, topCategory, totalDebt)

    return NextResponse.json({
      success: true,
      data: { roast }
    })

  } catch (error) {
    console.error('Error generating roast:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate roast' },
      { status: 500 }
    )
  }
}

function getDefaultRoast(totalSpent: number, topCategory: string, totalDebt: number): string {
  const roasts = [
    `💸 Spent $${totalSpent.toFixed(0)} this month. That's rent in some places.`,
    `${topCategory}? Really? That's your priority? Interesting choice.`,
    `🔥 ${totalSpent > 1000 ? 'Four figures this month. Living large!' : 'At least you kept it under a grand?'}`,
    `Debt: $${totalDebt.toFixed(0)}. But hey, who's counting? (We are.)`,
    `💀 Your wallet called. It wants a break.`,
    `${topCategory} expenses going crazy. Someone's got priorities.`,
    `Another month, another financial adventure. How's that working out?`,
    `😅 Financial wellness is a journey, not a destination. You're... on a journey.`,
  ]
  return roasts[Math.floor(Math.random() * roasts.length)]
}

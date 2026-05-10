import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getDb, generateId, now } from '@/lib/db/client'
import type { MerchantCategory } from '@/lib/db/types'

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
    const categories = await db.prepare(
      'SELECT id, merchant_name, category FROM merchant_categories WHERE user_id = ?'
    ).bind(userId).all<MerchantCategory>()
    
    return NextResponse.json({
      success: true,
      data: categories.results.map((c: any) => ({
        id: c.id,
        merchant_name: c.merchant_name,
        category: c.category,
      })),
    })
  } catch (error) {
    console.error('Error fetching merchant categories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch merchant categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { merchant_name, category } = body
    
    if (!merchant_name || !category) {
      return NextResponse.json(
        { success: false, error: 'merchant_name and category are required' },
        { status: 400 }
      )
    }
    
    const db = await getDb()
    const normalizedName = merchant_name.toLowerCase().trim()
    const timestamp = now()
    const id = generateId()
    
    // Upsert via INSERT ... ON CONFLICT
    await db.prepare(
      `INSERT INTO merchant_categories (id, user_id, merchant_name, category, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, merchant_name) DO UPDATE SET category = excluded.category, updated_at = excluded.updated_at`
    ).bind(id, userId, normalizedName, category, timestamp, timestamp).run()
    
    // Get the actual id (might be existing row)
    const result = await db.prepare(
      'SELECT id FROM merchant_categories WHERE user_id = ? AND merchant_name = ?'
    ).bind(userId, normalizedName).first<MerchantCategory>()
    
    return NextResponse.json({
      success: true,
      data: { id: result?.id || id, merchant_name: normalizedName, category },
    })
  } catch (error) {
    console.error('Error saving merchant category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save merchant category' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const merchantName = searchParams.get('merchant_name')
    
    if (!merchantName) {
      return NextResponse.json(
        { success: false, error: 'merchant_name is required' },
        { status: 400 }
      )
    }
    
    const db = await getDb()
    await db.prepare(
      'DELETE FROM merchant_categories WHERE user_id = ? AND merchant_name = ?'
    ).bind(userId, merchantName.toLowerCase().trim()).run()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting merchant category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete merchant category' },
      { status: 500 }
    )
  }
}

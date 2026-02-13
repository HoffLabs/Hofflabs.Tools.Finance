import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCurrentUserId } from '@/lib/auth/utils'
import { getMerchantCategoriesCollection } from '@/lib/db/client'

// GET - Fetch all merchant category overrides for the user
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const collection = await getMerchantCategoriesCollection()
    
    const categories = await collection
      .find({ user_id: new ObjectId(userId) })
      .toArray()
    
    return NextResponse.json({
      success: true,
      data: categories.map(c => ({
        id: c._id?.toString(),
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

// POST - Create or update a merchant category override
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
    
    const collection = await getMerchantCategoriesCollection()
    const normalizedName = merchant_name.toLowerCase().trim()
    const now = new Date()
    
    // Upsert - update if exists, insert if not
    const result = await collection.findOneAndUpdate(
      {
        user_id: new ObjectId(userId),
        merchant_name: normalizedName,
      },
      {
        $set: {
          category,
          updated_at: now,
        },
        $setOnInsert: {
          user_id: new ObjectId(userId),
          merchant_name: normalizedName,
          created_at: now,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    )
    
    return NextResponse.json({
      success: true,
      data: {
        id: result?._id?.toString(),
        merchant_name: normalizedName,
        category,
      },
    })
  } catch (error) {
    console.error('Error saving merchant category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save merchant category' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a merchant category override
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
    
    const collection = await getMerchantCategoriesCollection()
    
    await collection.deleteOne({
      user_id: new ObjectId(userId),
      merchant_name: merchantName.toLowerCase().trim(),
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting merchant category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete merchant category' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'

// FRED API series IDs for key interest rates
const FRED_SERIES = {
  FEDFUNDS: 'Federal Funds Effective Rate',
  PRIME: 'Bank Prime Loan Rate',
  DISCOUNT: 'Discount Window Primary Credit Rate',
  MORTGAGE30: '30-Year Fixed Rate Mortgage Average',
  MORTGAGE15: '15-Year Fixed Rate Mortgage Average',
  TREASURY10Y: '10-Year Treasury Constant Maturity Rate',
  TREASURY2Y: '2-Year Treasury Constant Maturity Rate',
  TREASURY1Y: '1-Year Treasury Constant Maturity Rate',
}

interface FedRate {
  id: string
  name: string
  rate: number
  date: string
  change?: number
  description: string
}

// Fetch rate from FRED API
async function fetchFredRate(seriesId: string): Promise<{ value: number; date: string } | null> {
  const apiKey = process.env.FRED_API_KEY
  
  if (!apiKey) {
    return null
  }

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`
    const response = await fetch(url, { next: { revalidate: 3600 } }) // Cache for 1 hour
    
    if (!response.ok) {
      console.error(`FRED API error for ${seriesId}: ${response.status}`)
      return null
    }

    const data = await response.json()
    const observations = data.observations

    if (observations && observations.length > 0) {
      const latest = observations[0]
      return {
        value: parseFloat(latest.value),
        date: latest.date,
      }
    }
  } catch (error) {
    console.error(`Error fetching FRED rate ${seriesId}:`, error)
  }
  
  return null
}

// Get fallback rates (recent historical data as backup)
function getFallbackRates(): FedRate[] {
  const today = new Date().toISOString().split('T')[0]
  
  return [
    {
      id: 'FEDFUNDS',
      name: 'Federal Funds Rate',
      rate: 5.33,
      date: today,
      description: 'The interest rate at which banks lend reserve balances to other banks overnight',
    },
    {
      id: 'PRIME',
      name: 'Prime Rate',
      rate: 8.50,
      date: today,
      description: 'The rate banks charge their most creditworthy customers',
    },
    {
      id: 'DISCOUNT',
      name: 'Discount Rate',
      rate: 5.50,
      date: today,
      description: 'The rate the Federal Reserve charges banks for short-term loans',
    },
    {
      id: 'MORTGAGE30',
      name: '30-Year Mortgage',
      rate: 6.89,
      date: today,
      description: 'Average rate for a 30-year fixed-rate mortgage',
    },
    {
      id: 'MORTGAGE15',
      name: '15-Year Mortgage',
      rate: 6.12,
      date: today,
      description: 'Average rate for a 15-year fixed-rate mortgage',
    },
    {
      id: 'TREASURY10Y',
      name: '10-Year Treasury',
      rate: 4.52,
      date: today,
      description: 'Yield on 10-year U.S. Treasury bonds',
    },
    {
      id: 'TREASURY2Y',
      name: '2-Year Treasury',
      rate: 4.89,
      date: today,
      description: 'Yield on 2-year U.S. Treasury bonds',
    },
    {
      id: 'TREASURY1Y',
      name: '1-Year Treasury',
      rate: 5.02,
      date: today,
      description: 'Yield on 1-year U.S. Treasury bonds',
    },
  ]
}

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const hasApiKey = !!process.env.FRED_API_KEY
    let rates: FedRate[] = []

    if (hasApiKey) {
      // Try to fetch live data from FRED API
      const seriesIds = [
        'FEDFUNDS',
        'PRIME',
        'DISCOUNT',
        'MORTGAGE30US',
        'MORTGAGE15US',
        'DGS10',
        'DGS2',
        'DGS1',
      ]

      const descriptions: Record<string, string> = {
        FEDFUNDS: 'The interest rate at which banks lend reserve balances to other banks overnight',
        PRIME: 'The rate banks charge their most creditworthy customers',
        DISCOUNT: 'The rate the Federal Reserve charges banks for short-term loans',
        MORTGAGE30US: 'Average rate for a 30-year fixed-rate mortgage',
        MORTGAGE15US: 'Average rate for a 15-year fixed-rate mortgage',
        DGS10: 'Yield on 10-year U.S. Treasury bonds',
        DGS2: 'Yield on 2-year U.S. Treasury bonds',
        DGS1: 'Yield on 1-year U.S. Treasury bonds',
      }

      const names: Record<string, string> = {
        FEDFUNDS: 'Federal Funds Rate',
        PRIME: 'Prime Rate',
        DISCOUNT: 'Discount Rate',
        MORTGAGE30US: '30-Year Mortgage',
        MORTGAGE15US: '15-Year Mortgage',
        DGS10: '10-Year Treasury',
        DGS2: '2-Year Treasury',
        DGS1: '1-Year Treasury',
      }

      const results = await Promise.all(
        seriesIds.map(async (seriesId) => {
          const data = await fetchFredRate(seriesId)
          if (data && !isNaN(data.value)) {
            return {
              id: seriesId,
              name: names[seriesId] || seriesId,
              rate: data.value,
              date: data.date,
              description: descriptions[seriesId] || '',
            }
          }
          return null
        })
      )

      rates = results.filter((r): r is FedRate => r !== null)
    }

    // Use fallback if no FRED API key or no results
    if (rates.length === 0) {
      rates = getFallbackRates()
    }

    return NextResponse.json({
      success: true,
      data: {
        rates,
        source: hasApiKey && rates.length > 0 ? 'FRED API' : 'Cached Data',
        lastUpdated: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching federal rates:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch federal rates' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/utils'

interface Lender {
  name: string
  type: 'bank' | 'credit_union' | 'online'
}

interface LoanRate {
  lender: Lender
  rate: number
  apr: number
  term?: string
  minCreditScore?: number
}

interface LocalRates {
  zipCode: string
  region: string
  mortgageRates: {
    thirtyYear: LoanRate[]
    fifteenYear: LoanRate[]
  }
  autoLoanRates: {
    newCar: LoanRate[]
    usedCar: LoanRate[]
  }
  personalLoanRates: LoanRate[]
  savingsRates: {
    lender: Lender
    apy: number
    minDeposit: number
  }[]
  cdRates: {
    lender: Lender
    term: string
    apy: number
    minDeposit: number
  }[]
}

// Regional rate adjustments based on zip code prefix
function getRegionData(zipCode: string): { region: string; adjustment: number } {
  const prefix = parseInt(zipCode.substring(0, 3))
  
  // Northeast (high cost of living)
  if ((prefix >= 10 && prefix <= 14) || (prefix >= 60 && prefix <= 69)) {
    return { region: 'Northeast', adjustment: 0.15 }
  }
  // West Coast (high cost of living)
  if ((prefix >= 900 && prefix <= 961) || (prefix >= 970 && prefix <= 979)) {
    return { region: 'West Coast', adjustment: 0.20 }
  }
  // Southeast
  if (prefix >= 300 && prefix <= 399) {
    return { region: 'Southeast', adjustment: -0.10 }
  }
  // Midwest
  if (prefix >= 400 && prefix <= 599) {
    return { region: 'Midwest', adjustment: -0.05 }
  }
  // Southwest
  if (prefix >= 700 && prefix <= 799) {
    return { region: 'Southwest', adjustment: 0.05 }
  }
  // Mountain region
  if (prefix >= 800 && prefix <= 899) {
    return { region: 'Mountain', adjustment: 0.00 }
  }
  
  return { region: 'United States', adjustment: 0.00 }
}

// Generate deterministic but varied rates based on zip code
function hashZipCode(zipCode: string, seed: number): number {
  let hash = 0
  const str = zipCode + seed.toString()
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash) / 2147483647 // Normalize to 0-1
}

// Common lenders (mix of national and simulated local)
function getLenders(zipCode: string): Lender[] {
  const localBankNumber = Math.floor(hashZipCode(zipCode, 1) * 5) + 1
  
  return [
    { name: 'Chase Bank', type: 'bank' },
    { name: 'Bank of America', type: 'bank' },
    { name: 'Wells Fargo', type: 'bank' },
    { name: `Regional Bank ${localBankNumber}`, type: 'bank' },
    { name: 'Navy Federal Credit Union', type: 'credit_union' },
    { name: 'Local Credit Union', type: 'credit_union' },
    { name: 'SoFi', type: 'online' },
    { name: 'Rocket Mortgage', type: 'online' },
    { name: 'Better.com', type: 'online' },
  ]
}

function generateLocalRates(zipCode: string): LocalRates {
  const { region, adjustment } = getRegionData(zipCode)
  const lenders = getLenders(zipCode)
  
  // Base rates (approximate current market rates)
  const baseMortgage30 = 6.89
  const baseMortgage15 = 6.12
  const baseAutoNew = 7.25
  const baseAutoUsed = 8.50
  const basePersonal = 11.50
  const baseSavings = 4.50
  const baseCd12Month = 4.75
  
  // Generate mortgage rates
  const thirtyYearRates: LoanRate[] = lenders.slice(0, 5).map((lender, i) => {
    const variance = (hashZipCode(zipCode, i * 10) - 0.5) * 0.5
    const rate = baseMortgage30 + adjustment + variance
    return {
      lender,
      rate: Math.round(rate * 100) / 100,
      apr: Math.round((rate + 0.15) * 100) / 100,
      term: '30 years',
      minCreditScore: 620 + Math.floor(hashZipCode(zipCode, i * 11) * 60),
    }
  }).sort((a, b) => a.rate - b.rate)
  
  const fifteenYearRates: LoanRate[] = lenders.slice(0, 5).map((lender, i) => {
    const variance = (hashZipCode(zipCode, i * 20) - 0.5) * 0.4
    const rate = baseMortgage15 + adjustment + variance
    return {
      lender,
      rate: Math.round(rate * 100) / 100,
      apr: Math.round((rate + 0.12) * 100) / 100,
      term: '15 years',
      minCreditScore: 620 + Math.floor(hashZipCode(zipCode, i * 21) * 60),
    }
  }).sort((a, b) => a.rate - b.rate)
  
  // Generate auto loan rates
  const newCarRates: LoanRate[] = lenders.slice(0, 4).map((lender, i) => {
    const variance = (hashZipCode(zipCode, i * 30) - 0.5) * 1.0
    const rate = baseAutoNew + variance
    return {
      lender,
      rate: Math.round(rate * 100) / 100,
      apr: Math.round((rate + 0.1) * 100) / 100,
      term: '60 months',
      minCreditScore: 660 + Math.floor(hashZipCode(zipCode, i * 31) * 40),
    }
  }).sort((a, b) => a.rate - b.rate)
  
  const usedCarRates: LoanRate[] = lenders.slice(0, 4).map((lender, i) => {
    const variance = (hashZipCode(zipCode, i * 40) - 0.5) * 1.2
    const rate = baseAutoUsed + variance
    return {
      lender,
      rate: Math.round(rate * 100) / 100,
      apr: Math.round((rate + 0.1) * 100) / 100,
      term: '48 months',
      minCreditScore: 640 + Math.floor(hashZipCode(zipCode, i * 41) * 40),
    }
  }).sort((a, b) => a.rate - b.rate)
  
  // Generate personal loan rates
  const personalLoanRates: LoanRate[] = lenders.slice(5, 9).map((lender, i) => {
    const variance = (hashZipCode(zipCode, i * 50) - 0.5) * 3.0
    const rate = basePersonal + variance
    return {
      lender,
      rate: Math.round(rate * 100) / 100,
      apr: Math.round((rate + 0.5) * 100) / 100,
      term: '36 months',
      minCreditScore: 680 + Math.floor(hashZipCode(zipCode, i * 51) * 40),
    }
  }).sort((a, b) => a.rate - b.rate)
  
  // Generate savings rates
  const savingsRates = lenders.slice(0, 5).map((lender, i) => {
    const variance = (hashZipCode(zipCode, i * 60) - 0.5) * 0.75
    const apy = baseSavings + variance
    return {
      lender,
      apy: Math.round(apy * 100) / 100,
      minDeposit: [0, 100, 500, 1000, 2500][Math.floor(hashZipCode(zipCode, i * 61) * 5)],
    }
  }).sort((a, b) => b.apy - a.apy)
  
  // Generate CD rates
  const cdRates = [
    { term: '6 months', baseRate: baseCd12Month - 0.25 },
    { term: '12 months', baseRate: baseCd12Month },
    { term: '24 months', baseRate: baseCd12Month + 0.15 },
    { term: '60 months', baseRate: baseCd12Month + 0.25 },
  ].flatMap(({ term, baseRate }) =>
    lenders.slice(0, 3).map((lender, i) => {
      const variance = (hashZipCode(zipCode, i * 70 + baseRate * 100) - 0.5) * 0.5
      return {
        lender,
        term,
        apy: Math.round((baseRate + variance) * 100) / 100,
        minDeposit: [500, 1000, 2500, 5000][Math.floor(hashZipCode(zipCode, i * 71) * 4)],
      }
    })
  ).sort((a, b) => b.apy - a.apy)
  
  return {
    zipCode,
    region,
    mortgageRates: {
      thirtyYear: thirtyYearRates,
      fifteenYear: fifteenYearRates,
    },
    autoLoanRates: {
      newCar: newCarRates,
      usedCar: usedCarRates,
    },
    personalLoanRates,
    savingsRates,
    cdRates,
  }
}

// Validate US zip code format
function isValidZipCode(zipCode: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zipCode)
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const zipCode = searchParams.get('zipCode')
    
    if (!zipCode) {
      return NextResponse.json(
        { success: false, error: 'Zip code is required' },
        { status: 400 }
      )
    }
    
    // Normalize zip code (take first 5 digits)
    const normalizedZip = zipCode.substring(0, 5)
    
    if (!isValidZipCode(normalizedZip)) {
      return NextResponse.json(
        { success: false, error: 'Invalid zip code format' },
        { status: 400 }
      )
    }

    const rates = generateLocalRates(normalizedZip)

    return NextResponse.json({
      success: true,
      data: {
        ...rates,
        disclaimer: 'Rates shown are for informational purposes only and may not reflect actual current rates. Contact lenders directly for accurate quotes.',
        lastUpdated: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching local rates:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch local rates' },
      { status: 500 }
    )
  }
}

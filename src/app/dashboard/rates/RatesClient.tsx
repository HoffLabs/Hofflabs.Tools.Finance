"use client"

import { useState, useEffect } from 'react'

interface FedRate {
  id: string
  name: string
  rate: number
  date: string
  description: string
}

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

interface SavingsRate {
  lender: Lender
  apy: number
  minDeposit: number
}

interface CdRate {
  lender: Lender
  term: string
  apy: number
  minDeposit: number
}

interface LocalRatesData {
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
  savingsRates: SavingsRate[]
  cdRates: CdRate[]
  disclaimer: string
  lastUpdated: string
}

type RateCategory = 'mortgage' | 'auto' | 'personal' | 'savings' | 'cd'

export default function RatesClient() {
  const [federalRates, setFederalRates] = useState<FedRate[]>([])
  const [federalSource, setFederalSource] = useState<string>('')
  const [localRates, setLocalRates] = useState<LocalRatesData | null>(null)
  const [zipCode, setZipCode] = useState<string>('')
  const [savedZipCode, setSavedZipCode] = useState<string>('')
  const [loadingFederal, setLoadingFederal] = useState(true)
  const [loadingLocal, setLoadingLocal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<RateCategory>('mortgage')

  // Fetch user settings to get saved zip code
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const response = await fetch('/api/user/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.data?.zipCode) {
            setSavedZipCode(data.data.zipCode)
            setZipCode(data.data.zipCode)
          }
        }
      } catch (err) {
        console.error('Error fetching user settings:', err)
      }
    }
    fetchUserSettings()
  }, [])

  // Fetch federal rates on mount
  useEffect(() => {
    const fetchFederalRates = async () => {
      try {
        setLoadingFederal(true)
        const response = await fetch('/api/rates/federal')
        if (!response.ok) throw new Error('Failed to fetch federal rates')
        const data = await response.json()
        setFederalRates(data.data.rates)
        setFederalSource(data.data.source)
      } catch (err) {
        console.error('Error fetching federal rates:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch federal rates')
      } finally {
        setLoadingFederal(false)
      }
    }
    fetchFederalRates()
  }, [])

  // Auto-fetch local rates if user has saved zip code
  useEffect(() => {
    if (savedZipCode && !localRates) {
      fetchLocalRates(savedZipCode)
    }
  }, [savedZipCode])

  const fetchLocalRates = async (zip: string) => {
    if (!zip || zip.length < 5) return

    try {
      setLoadingLocal(true)
      setError(null)
      const response = await fetch(`/api/rates/local?zipCode=${zip}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch local rates')
      }
      const data = await response.json()
      setLocalRates(data.data)
    } catch (err) {
      console.error('Error fetching local rates:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch local rates')
    } finally {
      setLoadingLocal(false)
    }
  }

  const handleZipCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLocalRates(zipCode)
  }

  const formatRate = (rate: number) => `${rate.toFixed(2)}%`
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

  const getLenderIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'credit_union':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      case 'online':
        return (
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        )
      default:
        return null
    }
  }

  const categoryTabs: { id: RateCategory; label: string }[] = [
    { id: 'mortgage', label: 'Mortgages' },
    { id: 'auto', label: 'Auto Loans' },
    { id: 'personal', label: 'Personal Loans' },
    { id: 'savings', label: 'Savings' },
    { id: 'cd', label: 'CDs' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Interest Rates</h1>

          {/* Federal Reserve Rates */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Federal Reserve & Market Rates</h2>
              {federalSource && (
                <span className="text-sm text-gray-500">Source: {federalSource}</span>
              )}
            </div>

            {loadingFederal ? (
              <p className="text-gray-600">Loading federal rates...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {federalRates.map((rate) => (
                  <div
                    key={rate.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-700">{rate.name}</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{formatRate(rate.rate)}</p>
                    <p className="text-xs text-gray-500 mt-1">{rate.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Local Rates Lookup */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Local Lender Rates</h2>

            {/* Zip Code Input */}
            <form onSubmit={handleZipCodeSubmit} className="mb-6">
              <div className="flex items-end gap-4">
                <div className="flex-1 max-w-xs">
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Enter ZIP Code
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="e.g. 90210"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    maxLength={5}
                  />
                </div>
                <button
                  type="submit"
                  disabled={zipCode.length !== 5 || loadingLocal}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loadingLocal ? 'Loading...' : 'Search Rates'}
                </button>
              </div>
              {savedZipCode && savedZipCode !== zipCode && (
                <p className="text-sm text-gray-500 mt-2">
                  Your saved ZIP code: {savedZipCode}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setZipCode(savedZipCode)
                      fetchLocalRates(savedZipCode)
                    }}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Use this
                  </button>
                </p>
              )}
            </form>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {localRates && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Showing rates for {localRates.zipCode}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">({localRates.region})</span>
                  </div>
                </div>

                {/* Category Tabs */}
                <div className="border-b border-gray-200 mb-4">
                  <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {categoryTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveCategory(tab.id)}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                          activeCategory === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Mortgage Rates */}
                {activeCategory === 'mortgage' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">30-Year Fixed Mortgage</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lender</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APR</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Credit Score</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {localRates.mortgageRates.thirtyYear.map((rate, idx) => (
                              <tr key={idx} className={idx === 0 ? 'bg-green-50' : ''}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {getLenderIcon(rate.lender.type)}
                                    <span className="text-sm font-medium text-gray-900">{rate.lender.name}</span>
                                    {idx === 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Best Rate
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatRate(rate.rate)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatRate(rate.apr)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rate.minCreditScore}+</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">15-Year Fixed Mortgage</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lender</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APR</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Credit Score</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {localRates.mortgageRates.fifteenYear.map((rate, idx) => (
                              <tr key={idx} className={idx === 0 ? 'bg-green-50' : ''}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {getLenderIcon(rate.lender.type)}
                                    <span className="text-sm font-medium text-gray-900">{rate.lender.name}</span>
                                    {idx === 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Best Rate
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatRate(rate.rate)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatRate(rate.apr)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rate.minCreditScore}+</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Auto Loan Rates */}
                {activeCategory === 'auto' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">New Car Loans (60 months)</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lender</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APR</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Credit Score</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {localRates.autoLoanRates.newCar.map((rate, idx) => (
                              <tr key={idx} className={idx === 0 ? 'bg-green-50' : ''}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {getLenderIcon(rate.lender.type)}
                                    <span className="text-sm font-medium text-gray-900">{rate.lender.name}</span>
                                    {idx === 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Best Rate
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatRate(rate.rate)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatRate(rate.apr)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rate.minCreditScore}+</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Used Car Loans (48 months)</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lender</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APR</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Credit Score</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {localRates.autoLoanRates.usedCar.map((rate, idx) => (
                              <tr key={idx} className={idx === 0 ? 'bg-green-50' : ''}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {getLenderIcon(rate.lender.type)}
                                    <span className="text-sm font-medium text-gray-900">{rate.lender.name}</span>
                                    {idx === 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Best Rate
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatRate(rate.rate)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatRate(rate.apr)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rate.minCreditScore}+</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Loan Rates */}
                {activeCategory === 'personal' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Loans (36 months)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lender</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APR</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Credit Score</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {localRates.personalLoanRates.map((rate, idx) => (
                            <tr key={idx} className={idx === 0 ? 'bg-green-50' : ''}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getLenderIcon(rate.lender.type)}
                                  <span className="text-sm font-medium text-gray-900">{rate.lender.name}</span>
                                  {idx === 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Best Rate
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatRate(rate.rate)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatRate(rate.apr)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rate.minCreditScore}+</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Savings Rates */}
                {activeCategory === 'savings' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">High-Yield Savings Accounts</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lender</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APY</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Deposit</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {localRates.savingsRates.map((rate, idx) => (
                            <tr key={idx} className={idx === 0 ? 'bg-green-50' : ''}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getLenderIcon(rate.lender.type)}
                                  <span className="text-sm font-medium text-gray-900">{rate.lender.name}</span>
                                  {idx === 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Best APY
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">{formatRate(rate.apy)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {rate.minDeposit === 0 ? 'No minimum' : formatCurrency(rate.minDeposit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CD Rates */}
                {activeCategory === 'cd' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Certificate of Deposit (CD) Rates</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lender</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APY</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Deposit</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {localRates.cdRates.map((rate, idx) => (
                            <tr key={idx} className={idx === 0 ? 'bg-green-50' : ''}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getLenderIcon(rate.lender.type)}
                                  <span className="text-sm font-medium text-gray-900">{rate.lender.name}</span>
                                  {idx === 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Best APY
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{rate.term}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">{formatRate(rate.apy)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatCurrency(rate.minDeposit)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">{localRates.disclaimer}</p>
                </div>
              </>
            )}

            {!localRates && !loadingLocal && (
              <div className="text-center py-8 text-gray-500">
                <p>Enter a ZIP code above to see local lender rates in your area.</p>
                {savedZipCode && (
                  <button
                    onClick={() => fetchLocalRates(savedZipCode)}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Use your saved ZIP code ({savedZipCode})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

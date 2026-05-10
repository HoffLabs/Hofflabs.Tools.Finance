"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Toggle from '@/app/components/Toggle'
import PlaidLinkButton from '@/app/components/PlaidLinkButton'
import ConfirmModal from '@/app/components/ConfirmModal'
import { estimateTaxes, getStateFromZip, getStateName } from '@/app/dashboard/utils/taxEstimator'
import { DEFAULT_APP_NAME, DEFAULT_LOGO_URL } from '@/app/components/BrandingProvider'
import Logo from '@/app/components/Logo'
import type { PaycheckDeductions } from '@/lib/db/types'

interface Account {
  id: string
  name: string
  type: string
  subtype?: string
  mask: string
  balance: number
}

export default function SettingsClient({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false)
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null)
  const [twoFactorQRCode, setTwoFactorQRCode] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [show2FASetup, setShow2FASetup] = useState<boolean>(false)
  const [zipCode, setZipCode] = useState<string>('')
  const [zipCodeSaved, setZipCodeSaved] = useState<boolean>(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  // Feature toggles
  const [showRates, setShowRates] = useState(true)
  const [showCharts, setShowCharts] = useState(true)
  // AI config
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiUrl, setAiUrl] = useState('https://litellm-prod.concluda.ai')
  const [aiKey, setAiKey] = useState('')
  const [aiModel, setAiModel] = useState('gpt-4o-mini')
  const [aiTesting, setAiTesting] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [removeAccountId, setRemoveAccountId] = useState<string | null>(null)
  // Income & profile
  const [payType, setPayType] = useState<'salary' | 'hourly'>('salary')
  const [yearlyIncome, setYearlyIncome] = useState<string>('')
  const [hourlyRate, setHourlyRate] = useState<string>('')
  const [hoursPerWeek, setHoursPerWeek] = useState<string>('40')
  const [payFrequency, setPayFrequency] = useState<'weekly' | 'biweekly' | 'semimonthly' | 'monthly'>('biweekly')
  const [annualBonus, setAnnualBonus] = useState<string>('')
  const [age, setAge] = useState<string>('')
  const [nextPayDate, setNextPayDate] = useState<string>('')
  const [incomeSaved, setIncomeSaved] = useState<boolean>(false)
  // Paycheck deductions
  const [deductions, setDeductions] = useState<PaycheckDeductions>({
    retirement: 0,
    healthInsurance: 0,
    hsa: 0,
    dentalVision: 0,
    otherPreTax: 0,
  })
  const [deductionsSaved, setDeductionsSaved] = useState<boolean>(false)
  // Branding
  const [brandAppName, setBrandAppName] = useState<string>(DEFAULT_APP_NAME)
  const [brandLogoUrl, setBrandLogoUrl] = useState<string>(DEFAULT_LOGO_URL)
  const [brandingSaved, setBrandingSaved] = useState<boolean>(false)

  const router = useRouter()

  // Fetch user settings
  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch user settings
      const settingsResponse = await fetch('/api/user/settings')
      if (!settingsResponse.ok) throw new Error('Failed to fetch settings')
      const settingsData = await settingsResponse.json()
      
      setTwoFactorEnabled(settingsData.data.twoFactorEnabled || false)
      setZipCode(settingsData.data.zipCode || '')

      // Load preferences
      const prefs = settingsData.data.preferences || {}
      setShowRates(prefs.showRates !== false)
      setShowCharts(prefs.showCharts !== false)
      // Income fields
      if (prefs.payType) setPayType(prefs.payType)
      if (prefs.yearlyIncome) setYearlyIncome(prefs.yearlyIncome.toString())
      if (prefs.hourlyRate) setHourlyRate(prefs.hourlyRate.toString())
      if (prefs.hoursPerWeek) setHoursPerWeek(prefs.hoursPerWeek.toString())
      if (prefs.payFrequency) setPayFrequency(prefs.payFrequency)
      if (prefs.annualBonus) setAnnualBonus(prefs.annualBonus.toString())
      if (prefs.age) setAge(prefs.age.toString())
      if (prefs.nextPayDate) setNextPayDate(prefs.nextPayDate)
      if (prefs.ai) {
        setAiEnabled(prefs.ai.enabled || false)
        setAiUrl(prefs.ai.apiUrl || 'https://litellm-prod.concluda.ai')
        setAiKey(prefs.ai.apiKey || '')
        setAiModel(prefs.ai.model || 'gpt-4o-mini')
      }
      if (prefs.deductions) setDeductions(prefs.deductions)
      if (prefs.branding?.appName) setBrandAppName(prefs.branding.appName)
      if (prefs.branding?.logoUrl) setBrandLogoUrl(prefs.branding.logoUrl)

      // Fetch connected accounts
      const accountsResponse = await fetch('/api/accounts')
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        setAccounts(accountsData.data?.accounts || [])
      }
      
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [userId])

  // Enable 2FA
  const enableTwoFactor = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Request 2FA setup
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) throw new Error('Failed to setup 2FA')
      
      const data = await response.json()
      setTwoFactorSecret(data.secret)
      setTwoFactorQRCode(data.qrCode)
      setShow2FASetup(true)
      
    } catch (err) {
      console.error('Error enabling 2FA:', err)
      setError(err instanceof Error ? err.message : 'Failed to enable 2FA')
    } finally {
      setLoading(false)
    }
  }

  // Verify and enable 2FA
  const verifyTwoFactor = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Verify 2FA code
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
          secret: twoFactorSecret,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to verify 2FA')
      
      // Enable 2FA in user settings
      const enableResponse = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twoFactorEnabled: true,
        }),
      })
      
      if (!enableResponse.ok) throw new Error('Failed to enable 2FA')
      
      setTwoFactorEnabled(true)
      setShow2FASetup(false)
      
    } catch (err) {
      console.error('Error verifying 2FA:', err)
      setError(err instanceof Error ? err.message : 'Failed to verify 2FA')
    } finally {
      setLoading(false)
    }
  }

  // Save zip code
  const saveZipCode = async () => {
    try {
      setLoading(true)
      setError(null)
      setZipCodeSaved(false)
      
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zipCode: zipCode,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save zip code')
      }
      
      setZipCodeSaved(true)
      setTimeout(() => setZipCodeSaved(false), 3000)
      
    } catch (err) {
      console.error('Error saving zip code:', err)
      setError(err instanceof Error ? err.message : 'Failed to save zip code')
    } finally {
      setLoading(false)
    }
  }

  // Clear zip code
  const clearZipCode = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zipCode: '',
        }),
      })
      
      if (!response.ok) throw new Error('Failed to clear zip code')
      
      setZipCode('')
      
    } catch (err) {
      console.error('Error clearing zip code:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear zip code')
    } finally {
      setLoading(false)
    }
  }

  // Disable 2FA
  const disableTwoFactor = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Disable 2FA in user settings
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twoFactorEnabled: false,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to disable 2FA')
      
      setTwoFactorEnabled(false)
      
    } catch (err) {
      console.error('Error disabling 2FA:', err)
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  // Save preferences helper
  const savePreferences = async (prefs: Record<string, unknown>) => {
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      })
    } catch (err) {
      console.error('Error saving preferences:', err)
    }
  }

  const handleToggleRates = (v: boolean) => { setShowRates(v); savePreferences({ showRates: v }) }
  const handleToggleCharts = (v: boolean) => { setShowCharts(v); savePreferences({ showCharts: v }) }

  // Calculate monthly income from inputs
  const calcMonthlyIncome = (): number => {
    let base = 0
    if (payType === 'salary') {
      const yearly = parseFloat(yearlyIncome)
      if (!isNaN(yearly)) base = yearly / 12
    } else {
      const rate = parseFloat(hourlyRate)
      const hrs = parseFloat(hoursPerWeek) || 40
      if (!isNaN(rate)) base = (rate * hrs * 52) / 12
    }
    const bonus = parseFloat(annualBonus)
    if (!isNaN(bonus) && bonus > 0) base += bonus / 12
    return Math.round(base * 100) / 100
  }

  // Derive payDay from nextPayDate for the rest of the app
  const derivedPayDay = nextPayDate ? new Date(nextPayDate + 'T00:00:00').getDate() : 0
  const calculatedMonthly = calcMonthlyIncome()

  // Tax estimation
  const annualGross = calculatedMonthly * 12
  const taxEstimate = estimateTaxes(annualGross, zipCode)
  const detectedState = getStateFromZip(zipCode)

  // Total monthly deductions
  const totalMonthlyDeductions = (deductions.retirement || 0) + (deductions.healthInsurance || 0) + (deductions.hsa || 0) + (deductions.dentalVision || 0) + (deductions.otherPreTax || 0)

  // Take-home = after taxes and deductions
  const monthlyTakeHome = taxEstimate.monthlyTakeHome - totalMonthlyDeductions

  const handleSaveIncome = async () => {
    setIncomeSaved(false)
    const prefs: Record<string, unknown> = {
      payType,
      payFrequency,
      monthlyIncome: calculatedMonthly,
    }
    if (payType === 'salary') {
      const v = parseFloat(yearlyIncome)
      if (!isNaN(v)) prefs.yearlyIncome = v
    } else {
      const r = parseFloat(hourlyRate)
      if (!isNaN(r)) prefs.hourlyRate = r
      const h = parseFloat(hoursPerWeek)
      if (!isNaN(h)) prefs.hoursPerWeek = h
    }
    const bonus = parseFloat(annualBonus)
    if (!isNaN(bonus) && bonus > 0) prefs.annualBonus = bonus
    const ageNum = parseInt(age)
    if (!isNaN(ageNum) && ageNum > 0) prefs.age = ageNum
    if (nextPayDate) {
      prefs.nextPayDate = nextPayDate
      prefs.payDay = derivedPayDay
    }
    prefs.deductions = deductions
    await savePreferences(prefs)
    setIncomeSaved(true)
    setTimeout(() => setIncomeSaved(false), 3000)
  }

  const handleSaveDeductions = async () => {
    setDeductionsSaved(false)
    await savePreferences({ deductions })
    // Also re-save monthlyIncome & takeHomePay so dashboard picks it up
    if (calculatedMonthly > 0) {
      await savePreferences({ monthlyIncome: calculatedMonthly, takeHomePay: monthlyTakeHome > 0 ? Math.round(monthlyTakeHome * 100) / 100 : 0 })
    }
    setDeductionsSaved(true)
    setTimeout(() => setDeductionsSaved(false), 3000)
  }

  const handleSaveBranding = async () => {
    setBrandingSaved(false)
    await savePreferences({
      branding: {
        appName: brandAppName || DEFAULT_APP_NAME,
        logoUrl: brandLogoUrl || DEFAULT_LOGO_URL,
      },
    })
    setBrandingSaved(true)
    setTimeout(() => setBrandingSaved(false), 3000)
  }

  const handleSaveAiConfig = async () => {
    setAiTesting(false)
    setAiTestResult(null)
    await savePreferences({ ai: { enabled: aiEnabled, apiUrl: aiUrl, apiKey: aiKey, model: aiModel } })
  }

  const handleTestAi = async () => {
    setAiTesting(true)
    setAiTestResult(null)
    try {
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: ['STARBUCKS STORE 12345', 'AMAZON.COM'] }),
      })
      const data = await res.json()
      if (data.success) {
        const results = Object.entries(data.data).map(([n, c]) => `${n} → ${c}`).join(', ')
        setAiTestResult(`✓ ${results}`)
      } else {
        setAiTestResult(`✗ ${data.error}`)
      }
    } catch (err: unknown) {
      setAiTestResult(`✗ ${err instanceof Error ? err.message : 'Failed to test AI endpoint'}`)
    } finally {
      setAiTesting(false)
    }
  }

  // Delete account
  const deleteAccount = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/user/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
      if (!response.ok) throw new Error('Failed to delete account')
      router.push('/auth/login')
    } catch (err) {
      console.error('Error deleting account:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="skeleton h-4 w-32 mb-4" />
        <div className="skeleton h-10 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <p className="text-rose-400 text-sm mb-3">Error: {error}</p>
        <button onClick={fetchSettings} className="btn-primary text-sm">Retry</button>
      </div>
    )
  }

  const handleRemoveAccount = async (accountId: string) => {
    try {
      const res = await fetch(`/api/accounts/disconnect?account_id=${accountId}`, { method: 'POST' })
      if (res.ok) setAccounts(prev => prev.filter(a => a.id !== accountId))
    } catch (err) {
      console.error('Error removing account:', err)
    }
    setRemoveAccountId(null)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in-up">
      {/* Connected Accounts */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-emerald-400 mb-1">Connected Accounts</h2>
        <p className="text-sm text-slate-500 mb-4">Link your bank accounts via Plaid so we can judge your spending in real-time.</p>
        
        {accounts.length > 0 && (
          <div className="space-y-2 mb-4">
            {accounts.map(account => (
              <div key={account.id} className="flex items-center justify-between px-4 py-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${account.type === 'credit' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                    <span className={`font-semibold text-xs ${account.type === 'credit' ? 'text-purple-400' : 'text-blue-400'}`}>
                      {account.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{account.name}</p>
                    <p className="text-xs text-slate-500">•••{account.mask}</p>
                  </div>
                </div>
                <button onClick={() => setRemoveAccountId(account.id)} className="text-xs text-slate-500 hover:text-rose-400 transition-colors">Remove</button>
              </div>
            ))}
          </div>
        )}

        {accounts.length === 0 && (
          <div className="text-center py-4 mb-4 border border-dashed border-slate-700 rounded-lg">
            <p className="text-sm text-slate-500">No accounts connected yet</p>
          </div>
        )}
        
        <PlaidLinkButton />
      </div>

      {/* Personal & Income */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-emerald-400 mb-1">Personal & Income</h2>
        <p className="text-sm text-slate-500 mb-4">
          We use this to calculate savings rate, time cost of purchases, and payday countdowns.
        </p>

        {/* Pay type toggle */}
        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg mb-4 w-fit">
          {(['salary', 'hourly'] as const).map(t => (
            <button
              key={t}
              onClick={() => setPayType(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                payType === t ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Salary: yearly income */}
          {payType === 'salary' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Annual Salary ($)</label>
              <input
                type="number"
                value={yearlyIncome}
                onChange={(e) => setYearlyIncome(e.target.value)}
                placeholder="75000"
                className="input-dark"
                min="0"
                step="1000"
              />
            </div>
          )}

          {/* Hourly: rate + hours */}
          {payType === 'hourly' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Hourly Rate ($)</label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="35"
                  className="input-dark"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Hours / Week</label>
                <input
                  type="number"
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(e.target.value)}
                  placeholder="40"
                  className="input-dark"
                  min="1"
                  max="80"
                />
              </div>
            </>
          )}

          {/* Pay frequency */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Pay Frequency</label>
            <select
              value={payFrequency}
              onChange={(e) => setPayFrequency(e.target.value as typeof payFrequency)}
              className="input-dark"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="semimonthly">Semi-monthly (1st & 15th)</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Annual bonus */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Annual Bonus ($)</label>
            <input
              type="number"
              value={annualBonus}
              onChange={(e) => setAnnualBonus(e.target.value)}
              placeholder="0"
              className="input-dark"
              min="0"
              step="500"
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="30"
              className="input-dark"
              min="1"
              max="120"
            />
          </div>

          {/* Next pay date */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Next Pay Date</label>
            <input
              type="date"
              value={nextPayDate}
              onChange={(e) => setNextPayDate(e.target.value)}
              className="input-dark"
            />
          </div>
        </div>

        {/* Income & tax breakdown */}
        {calculatedMonthly > 0 && (
          <div className="mb-4 rounded-lg border border-slate-700/50 overflow-hidden">
            {/* Gross */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/40">
              <span className="text-xs text-slate-400">Gross Monthly</span>
              <span className="text-sm font-bold text-slate-200">${calculatedMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {parseFloat(annualBonus) > 0 && (
              <div className="px-4 py-1 bg-slate-800/20">
                <p className="text-[10px] text-slate-600">Includes ${(parseFloat(annualBonus) / 12).toFixed(0)}/mo from bonus</p>
              </div>
            )}
            {/* Taxes */}
            {zipCode.length === 5 && (
              <>
                <div className="flex items-center justify-between px-4 py-1.5 text-xs">
                  <span className="text-slate-500">Federal Tax</span>
                  <span className="text-rose-400/80">-${Math.round(taxEstimate.federal / 12).toLocaleString()}</span>
                </div>
                {taxEstimate.stateTax > 0 && (
                  <div className="flex items-center justify-between px-4 py-1.5 text-xs">
                    <span className="text-slate-500">State Tax{detectedState ? ` (${detectedState})` : ''}</span>
                    <span className="text-rose-400/80">-${Math.round(taxEstimate.stateTax / 12).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-1.5 text-xs">
                  <span className="text-slate-500">FICA (SS + Medicare)</span>
                  <span className="text-rose-400/80">-${Math.round(taxEstimate.fica / 12).toLocaleString()}</span>
                </div>
              </>
            )}
            {/* Deductions */}
            {totalMonthlyDeductions > 0 && (
              <div className="flex items-center justify-between px-4 py-1.5 text-xs border-t border-slate-700/30">
                <span className="text-slate-500">Pre-tax Deductions</span>
                <span className="text-amber-400/80">-${totalMonthlyDeductions.toLocaleString()}</span>
              </div>
            )}
            {/* Take-home */}
            {zipCode.length === 5 && (
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/5 border-t border-emerald-500/20">
                <div>
                  <span className="text-xs font-medium text-slate-300">Take-Home Pay</span>
                  <span className="text-[10px] text-slate-600 ml-2">{(taxEstimate.effectiveRate * 100).toFixed(1)}% effective rate</span>
                </div>
                <span className="text-lg font-bold text-emerald-400">${monthlyTakeHome > 0 ? monthlyTakeHome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</span>
              </div>
            )}
            {zipCode.length !== 5 && (
              <div className="px-4 py-2.5 bg-slate-800/20 border-t border-slate-700/30">
                <p className="text-[10px] text-slate-500">Set your ZIP code in Location Preferences to see tax estimates</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={handleSaveIncome} disabled={loading} className="btn-primary text-sm">
            {loading ? 'Saving...' : 'Save'}
          </button>
          {incomeSaved && <span className="text-sm text-emerald-400">Saved</span>}
        </div>
      </div>


      {/* Paycheck Deductions */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-emerald-400 mb-1">Paycheck Deductions</h2>
        <p className="text-sm text-slate-500 mb-4">
          Pre-tax deductions that come out before your paycheck hits. We'll subtract these from your take-home estimate.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">401(k) / 403(b) ($/mo)</label>
            <input
              type="number"
              value={deductions.retirement || ''}
              onChange={(e) => setDeductions(prev => ({ ...prev, retirement: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
              className="input-dark"
              min="0"
              step="50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Health Insurance ($/mo)</label>
            <input
              type="number"
              value={deductions.healthInsurance || ''}
              onChange={(e) => setDeductions(prev => ({ ...prev, healthInsurance: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
              className="input-dark"
              min="0"
              step="10"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">HSA Contribution ($/mo)</label>
            <input
              type="number"
              value={deductions.hsa || ''}
              onChange={(e) => setDeductions(prev => ({ ...prev, hsa: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
              className="input-dark"
              min="0"
              step="25"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Dental & Vision ($/mo)</label>
            <input
              type="number"
              value={deductions.dentalVision || ''}
              onChange={(e) => setDeductions(prev => ({ ...prev, dentalVision: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
              className="input-dark"
              min="0"
              step="5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Other Pre-Tax ($/mo)</label>
            <input
              type="number"
              value={deductions.otherPreTax || ''}
              onChange={(e) => setDeductions(prev => ({ ...prev, otherPreTax: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
              className="input-dark"
              min="0"
              step="10"
            />
          </div>
        </div>

        {totalMonthlyDeductions > 0 && (
          <div className="mb-4 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Total Monthly Deductions</span>
              <span className="text-lg font-bold text-amber-400">${totalMonthlyDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <p className="text-[10px] text-slate-600 mt-1">${(totalMonthlyDeductions * 12).toLocaleString()}/yr pre-tax</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={handleSaveDeductions} disabled={loading} className="btn-primary text-sm">
            {loading ? 'Saving...' : 'Save'}
          </button>
          {deductionsSaved && <span className="text-sm text-emerald-400">Saved</span>}
        </div>
      </div>

      {/* Branding */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-emerald-400 mb-1">Branding</h2>
        <p className="text-sm text-slate-500 mb-4">
          Customize the app name and logo. Leave blank to use the defaults.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">App Name</label>
            <input
              type="text"
              value={brandAppName}
              onChange={(e) => setBrandAppName(e.target.value)}
              placeholder={DEFAULT_APP_NAME}
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Logo URL</label>
            <input
              type="text"
              value={brandLogoUrl}
              onChange={(e) => setBrandLogoUrl(e.target.value)}
              placeholder={DEFAULT_LOGO_URL}
              className="input-dark"
            />
            <p className="text-[10px] text-slate-600 mt-1">Enter a URL to an image, or leave as default</p>
          </div>
          {brandLogoUrl && (
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <Logo size={40} src={brandLogoUrl} />
              <div>
                <p className="text-xs text-slate-400">Preview</p>
                <p className="text-sm font-semibold text-emerald-400">{brandAppName || DEFAULT_APP_NAME}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={handleSaveBranding} disabled={loading} className="btn-primary text-sm">
              {loading ? 'Saving...' : 'Save'}
            </button>
            {brandingSaved && <span className="text-sm text-emerald-400">Saved — reload to see changes</span>}
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-slate-200 mb-1">Dashboard & Navigation</h2>
        <p className="text-sm text-slate-500 mb-5">Choose what appears in your app and navigation experience.</p>
        <div className="space-y-5">
          <Toggle
            enabled={showRates}
            onChange={handleToggleRates}
            label="Interest Rates"
            description="Show the Rates page in navigation"
          />
          <Toggle
            enabled={showCharts}
            onChange={handleToggleCharts}
            label="Dashboard Charts"
            description="Show spending trend and category charts on dashboard"
          />
        </div>
        <div className="mt-5 pt-5 border-t border-slate-700/50">
          <p className="text-sm font-medium text-slate-200">Floating Navbar</p>
          <p className="text-xs text-slate-500 mt-1">
            Drag the floating navbar anywhere on the screen. Move it near edges to snap, and drag any corner handle to resize it.
          </p>
        </div>
      </div>

      {/* AI Categorization */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-slate-200 mb-1">AI Categorization</h2>
        <p className="text-sm text-slate-500 mb-5">Use an LLM to automatically categorize transactions and generate spending insights.</p>
        <div className="space-y-4">
          <Toggle enabled={aiEnabled} onChange={(v) => { setAiEnabled(v); savePreferences({ ai: { enabled: v, apiUrl: aiUrl, apiKey: aiKey, model: aiModel } }) }} label="Enable AI" description="Connect to a LiteLLM-compatible endpoint" />
          {aiEnabled && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">API URL</label>
                <input type="text" value={aiUrl} onChange={e => setAiUrl(e.target.value)} className="input-dark" placeholder="https://litellm-prod.concluda.ai" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">API Key (optional)</label>
                <input type="password" value={aiKey} onChange={e => setAiKey(e.target.value)} className="input-dark" placeholder="sk-..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Model</label>
                <input type="text" value={aiModel} onChange={e => setAiModel(e.target.value)} className="input-dark" placeholder="gpt-4o-mini" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveAiConfig} className="btn-primary text-sm">Save</button>
                <button onClick={handleTestAi} disabled={aiTesting} className="btn-ghost text-sm border border-slate-700">{aiTesting ? 'Testing...' : 'Test Connection'}</button>
              </div>
              {aiTestResult && (
                <p className={`text-xs ${aiTestResult.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>{aiTestResult}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zip Code Settings */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-slate-200 mb-1">Location Preferences</h2>
        <p className="text-sm text-slate-500 mb-4">
          Set your ZIP code to automatically see local interest rates.
        </p>
        
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label htmlFor="zipCode" className="block text-xs font-medium text-slate-400 mb-1.5">ZIP Code</label>
            <input type="text" id="zipCode" value={zipCode} onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="90210" className="input-dark" maxLength={5} />
          </div>
          <button onClick={saveZipCode} disabled={loading || zipCode.length !== 5} className="btn-primary text-sm">{loading ? 'Saving...' : 'Save'}</button>
          {zipCode && <button onClick={clearZipCode} disabled={loading} className="btn-ghost text-sm">Clear</button>}
        </div>
        {zipCodeSaved && <p className="mt-2 text-sm text-emerald-400">ZIP code saved!</p>}
      </div>

      {/* 2FA Settings */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-slate-200 mb-4">Two-Factor Authentication</h2>
        
        {twoFactorEnabled ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Two-factor authentication is currently <span className="text-emerald-400 font-medium">enabled</span>.</p>
            <button onClick={disableTwoFactor} disabled={loading} className="btn-danger text-sm">{loading ? 'Processing...' : 'Disable 2FA'}</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Two-factor authentication is not enabled.</p>
            <button onClick={enableTwoFactor} disabled={loading} className="btn-primary text-sm">{loading ? 'Processing...' : 'Enable 2FA'}</button>
          </div>
        )}
        
        {/* 2FA Setup */}
        {show2FASetup && (
          <div className="mt-6 p-5 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Set up Two-Factor Authentication</h3>
            <p className="text-xs text-slate-500 mb-4">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
            
            {twoFactorQRCode && (
              <div className="mb-4"><img src={twoFactorQRCode} alt="2FA QR Code" className="w-48 h-48 mx-auto rounded-lg" /></div>
            )}
            
            <p className="text-xs text-slate-500 mb-3">Or enter manually: <span className="font-mono text-slate-300">{twoFactorSecret}</span></p>
            
            <div className="mt-4">
              <label htmlFor="verification-code" className="block text-xs font-medium text-slate-400 mb-1.5">6-digit code:</label>
              <input id="verification-code" type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="input-dark" placeholder="123456" />
            </div>
            
            <div className="mt-4 flex gap-2">
              <button onClick={verifyTwoFactor} disabled={loading || verificationCode.length !== 6} className="btn-primary text-sm">{loading ? 'Verifying...' : 'Verify & Enable'}</button>
              <button onClick={() => { setShow2FASetup(false); setVerificationCode('') }} disabled={loading} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
      
      {/* Danger Zone */}
      <div className="glass-card p-6 border-rose-500/20 xl:col-span-2">
        <h2 className="text-base font-semibold text-rose-400 mb-1">Danger Zone</h2>
        <p className="text-sm text-slate-500 mb-4">Nuke everything. Like it never happened. No take-backsies.</p>
        <button onClick={() => setShowDeleteConfirm(true)} disabled={loading} className="btn-danger text-sm">{loading ? 'Processing...' : 'Delete Everything'}</button>
      </div>

      {/* Confirm modals */}
      {removeAccountId && (
        <ConfirmModal title="Remove Account" message="Remove this account and all its transactions?" variant="danger" confirmLabel="Remove" onConfirm={() => handleRemoveAccount(removeAccountId)} onCancel={() => setRemoveAccountId(null)} />
      )}
      {showDeleteConfirm && (
        <ConfirmModal title="Delete Account" message="This will permanently delete your account and all data. This cannot be undone." variant="danger" confirmLabel="Delete Everything" onConfirm={deleteAccount} onCancel={() => setShowDeleteConfirm(false)} />
      )}
    </div>
  )
}
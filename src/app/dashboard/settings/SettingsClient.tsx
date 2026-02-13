"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
      alert('2FA enabled successfully')
      
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
      alert('2FA disabled successfully')
      
    } catch (err) {
      console.error('Error disabling 2FA:', err)
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  // Delete account
  const deleteAccount = async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        setLoading(true)
        setError(null)
        
        // Delete account
        const response = await fetch('/api/user/delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) throw new Error('Failed to delete account')
        
        alert('Account deleted successfully')
        router.push('/auth/login')
        
      } catch (err) {
        console.error('Error deleting account:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete account')
      } finally {
        setLoading(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">Error: {error}</p>
        </div>
        <button
          onClick={fetchSettings}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Zip Code Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Location Preferences</h2>
        <p className="text-gray-600 mb-4">
          Set your ZIP code to automatically see local interest rates when visiting the Rates page.
        </p>
        
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code
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
            onClick={saveZipCode}
            disabled={loading || zipCode.length !== 5}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          {zipCode && (
            <button
              onClick={clearZipCode}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear
            </button>
          )}
        </div>
        
        {zipCodeSaved && (
          <p className="mt-2 text-sm text-green-600">ZIP code saved successfully!</p>
        )}
      </div>

      {/* 2FA Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Two-Factor Authentication</h2>
        
        {twoFactorEnabled ? (
          <div className="space-y-4">
            <p className="text-gray-600">Two-factor authentication is currently enabled for your account.</p>
            <button
              onClick={disableTwoFactor}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {loading ? 'Processing...' : 'Disable 2FA'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">Two-factor authentication is not enabled for your account.</p>
            <button
              onClick={enableTwoFactor}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Processing...' : 'Enable 2FA'}
            </button>
          </div>
        )}
        
        {/* 2FA Setup Modal */}
        {show2FASetup && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Set up Two-Factor Authentication</h3>
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            
            {twoFactorQRCode && (
              <div className="mb-4">
                <img src={twoFactorQRCode} alt="2FA QR Code" className="w-48 h-48 mx-auto" />
              </div>
            )}
            
            <p className="text-sm text-gray-600 mb-2">
              Or enter this secret manually: <span className="font-mono font-medium">{twoFactorSecret}</span>
            </p>
            
            <div className="mt-4">
              <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-1">
                Enter the 6-digit code from your authenticator app:
              </label>
              <input
                id="verification-code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="123456"
              />
            </div>
            
            <div className="mt-4 flex space-x-2">
              <button
                onClick={verifyTwoFactor}
                disabled={loading || verificationCode.length !== 6}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {loading ? 'Verifying...' : 'Verify and Enable'}
              </button>
              <button
                onClick={() => {
                  setShow2FASetup(false)
                  setVerificationCode('')
                }}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Account */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Delete Account</h2>
        <p className="text-gray-600 mb-4">
          Deleting your account will permanently remove all your data and cannot be undone.
        </p>
        <button
          onClick={deleteAccount}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          {loading ? 'Processing...' : 'Delete Account'}
        </button>
      </div>
    </div>
  )
}
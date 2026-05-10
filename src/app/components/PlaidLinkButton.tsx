"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Extend Window interface for Plaid Link
declare global {
  interface Window {
    Plaid: any
  }
}

export default function PlaidLinkButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Load Plaid Link script (only once per page)
  useEffect(() => {
    const PLAID_SCRIPT_SRC = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    const existingScript = document.querySelector(`script[src="${PLAID_SCRIPT_SRC}"]`)
    if (existingScript) return

    const script = document.createElement('script')
    script.src = PLAID_SCRIPT_SRC
    script.async = true
    script.onerror = () => {
      console.error('Failed to load Plaid Link script')
    }
    document.body.appendChild(script)
  }, [])

  // Get link token from backend
  const initializePlaidLink = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Call backend to get link token
      const response = await fetch('/api/plaid/link-token', {
        method: 'POST',
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to get link token')
      }
      
      const data = await response.json()
      
      if (!data.success || !data.link_token) {
        throw new Error(data.error || 'Invalid link token response')
      }
      
      setLinkToken(data.link_token)
      
    } catch (err) {
      console.error('Error initializing Plaid Link:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  // Initialize Plaid Link when we have a token
  useEffect(() => {
    if (!linkToken) return
    
    // Check if Plaid Link is available
    if (typeof window !== 'undefined' && window.Plaid) {
      const handler = window.Plaid.create({
        token: linkToken,
        onSuccess: async (publicToken: string, metadata: any) => {
          try {
            setLoading(true)
            
            // Exchange public token with backend
            const response = await fetch('/api/plaid/exchange', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ public_token: publicToken }),
              credentials: 'include',
            })
            
            const data = await response.json()
            
            if (!data.success) {
              throw new Error(data.error || 'Failed to exchange token')
            }
            
            // Show success message and refresh
            // Note: User will need to click "Sync Now" to fetch transactions
            alert('✅ Bank account connected! Now click "Sync My Mess" to load your financial chaos.')
            router.refresh()
            
          } catch (err) {
            console.error('Error exchanging token:', err)
            setError(err instanceof Error ? err.message : 'Unknown error')
          } finally {
            setLoading(false)
          }
        },
        onExit: (err: any, metadata: any) => {
          if (err) {
            console.error('Plaid Link exited with error:', err)
            setError(err.error_message || 'Plaid Link exited with error')
          }
          setLoading(false)
        },
        onEvent: (eventName: string, metadata: any) => {
          console.log('Plaid Link event:', eventName, metadata)
        },
      })
      
      // Open Plaid Link
      if (handler) {
        handler.open()
      }
    } else {
      console.error('Plaid Link not available')
      setError('Plaid Link not available')
      setLoading(false)
    }
    
  }, [linkToken, router])

  return (
    <div className="space-y-3">
      <button
        onClick={initializePlaidLink}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Connecting Your Financial Doom...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Link Bank Account
          </>
        )}
      </button>
      
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}
    </div>
  )
}
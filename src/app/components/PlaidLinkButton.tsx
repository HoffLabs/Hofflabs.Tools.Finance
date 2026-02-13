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

  // Load Plaid Link script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.async = true
    script.onload = () => {
      console.log('Plaid Link script loaded')
    }
    script.onerror = () => {
      console.error('Failed to load Plaid Link script')
    }
    document.body.appendChild(script)
    
    return () => {
      document.body.removeChild(script)
    }
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
            alert('Bank account connected successfully! Click "Sync Now" on the dashboard to load your transactions.')
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
    <div className="space-y-4">
      <button
        onClick={initializePlaidLink}
        disabled={loading}
        className={`w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
            Connect Bank Account
          </>
        )}
      </button>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
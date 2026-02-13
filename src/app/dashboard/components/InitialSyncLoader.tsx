"use client"

import { useState, useEffect } from 'react'

interface InitialSyncLoaderProps {
  onSyncComplete: () => void
}

export default function InitialSyncLoader({ onSyncComplete }: InitialSyncLoaderProps) {
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Ready to load your transactions')
  const [error, setError] = useState<string | null>(null)
  const [needsSync, setNeedsSync] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkSyncStatus()
  }, [])

  const checkSyncStatus = async () => {
    try {
      const statusResponse = await fetch('/api/plaid/sync-status')
      const statusData = await statusResponse.json()

      if (!statusData.success) {
        setError('Failed to check sync status')
        return
      }

      if (statusData.data.allSynced) {
        // Already synced, proceed to dashboard
        onSyncComplete()
        return
      }

      // Need initial sync
      setNeedsSync(true)
    } catch (err) {
      console.error('Error checking sync status:', err)
      setError(err instanceof Error ? err.message : 'Failed to check sync status')
    } finally {
      setChecking(false)
    }
  }

  const performSync = async () => {
    try {
      setSyncing(true)
      setStatus('Loading your transaction history...')
      setProgress(20)

      // Trigger sync
      const syncResponse = await fetch('/api/plaid/sync', {
        method: 'POST',
      })

      setProgress(50)
      setStatus('Processing transactions...')

      const syncData = await syncResponse.json()

      if (!syncData.success) {
        throw new Error('Sync failed')
      }

      setProgress(80)
      setStatus('Finalizing...')

      // Give a moment for the UI
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setProgress(100)
      setStatus('Complete!')

      // Wait a moment before transitioning
      await new Promise(resolve => setTimeout(resolve, 500))
      
      onSyncComplete()

    } catch (err) {
      console.error('Sync error:', err)
      setError(err instanceof Error ? err.message : 'Failed to sync data')
      setSyncing(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <p className="text-gray-600">Checking sync status...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sync Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => {
                setError(null)
                performSync()
              }}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show manual sync prompt if accounts need initial sync
  if (needsSync && !syncing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-6">
              <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Ready to Load Your Data
            </h2>
            <p className="text-gray-600 mb-6">
              Click below to sync your account and load your transaction history.
            </p>
            <button
              onClick={performSync}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Sync Now
            </button>
            <p className="text-sm text-gray-500 mt-4">
              This may take a minute for the first sync
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center">
          {/* Animated Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-6">
            <svg 
              className="h-10 w-10 text-blue-600 animate-spin" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Setting Up Your Dashboard
          </h2>
          
          <p className="text-gray-600 mb-8">
            {status}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm text-gray-500">
            {progress}% complete
          </p>

          {syncing && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800">
                <strong>First time setup:</strong> We're loading your complete transaction history. 
                This may take a minute.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

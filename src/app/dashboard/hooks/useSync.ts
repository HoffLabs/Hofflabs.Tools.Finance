import { useState, useEffect } from 'react'

export function useSync(onSyncComplete?: () => void) {
  const [syncing, setSyncing] = useState(false)
  const [initialSyncDone, setInitialSyncDone] = useState(false)

  const triggerSync = async (silent = false) => {
    try {
      setSyncing(true)
      const response = await fetch('/api/plaid/sync', {
        method: 'POST',
        credentials: 'include',
      })
      
      const data = await response.json()
      
      if (data.success) {
        if (!silent) {
          alert('Sync completed successfully!')
        }
        if (onSyncComplete) {
          await onSyncComplete()
        }
      } else {
        if (!silent) {
          alert(`Sync failed: ${data.error}`)
        }
      }
    } catch (err) {
      console.error('Sync error:', err)
      if (!silent) {
        alert('Failed to sync data')
      }
    } finally {
      setSyncing(false)
    }
  }

  // Mark as done immediately - no auto-sync on dashboard load
  // User must click "Sync Now" to fetch data from Plaid
  useEffect(() => {
    // const initializeData = async () => {
    //   if (initialSyncDone {
    //     await triggerSync(true)
    //     setInitialSyncDone(true)
    //   }
    // }
    setInitialSyncDone(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    syncing,
    initialSyncDone,
    triggerSync,
  }
}

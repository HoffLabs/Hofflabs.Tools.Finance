"use client"

import { useState, useEffect } from 'react'

export default function SyncProgressOverlay() {
  const [elapsed, setElapsed] = useState(0)
  const [phase, setPhase] = useState(0)

  const phases = [
    'Connecting to accounts...',
    'Fetching transactions...',
    'Processing data...',
    'Updating balances...',
  ]

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setPhase(p => (p + 1) % phases.length)
    }, 3000)
    return () => clearInterval(phaseTimer)
  }, [])

  const progress = Math.min(95, elapsed * 8)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card p-8 w-full max-w-md mx-4 animate-fade-in-up">
        {/* Animated icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 animate-pulse" />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-slate-100 text-center mb-2">Syncing Your Accounts</h3>
        <p className="text-sm text-slate-400 text-center mb-6 h-5 transition-all duration-300">{phases[phase]}</p>

        {/* Progress bar */}
        <div className="w-full bg-slate-700 rounded-full h-2 mb-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{Math.round(progress)}%</span>
          <span>{elapsed}s elapsed</span>
        </div>
      </div>
    </div>
  )
}

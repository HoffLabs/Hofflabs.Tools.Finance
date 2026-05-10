"use client"

import { useState, useEffect } from 'react'

export default function AiSpendingSummary() {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/ai/summary')
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data.success) {
          setEnabled(data.data.enabled)
          setSummary(data.data.summary || '')
        }
      } catch {
        // silently fail - AI summary is optional
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  if (!enabled) return null
  if (loading) {
    return (
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-start gap-3">
          <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="flex-1">
            <div className="skeleton h-3 w-24 mb-2" />
            <div className="skeleton h-4 w-full mb-1" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        </div>
      </div>
    )
  }
  if (!summary) return null

  return (
    <div className="glass-card p-5 bg-gradient-to-r from-amber-600/10 to-rose-600/10 border-amber-500/20 animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5">🔥 Your Spending Roast</p>
          <p className="text-sm text-slate-200 leading-relaxed">{summary}</p>
        </div>
      </div>
    </div>
  )
}

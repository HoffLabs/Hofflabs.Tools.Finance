"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/app/components/Logo'

export default function RegisterPage() {
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const formatNumber = (num: string) => num.replace(/(\d{4})(?=\d)/g, '$1 ').trim()

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to generate account')
        return
      }

      setGeneratedId(data.accountId)
    } catch (err) {
      console.error('Generation error:', err)
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedId) return
    await navigator.clipboard.writeText(generatedId)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fade-in-up">
        <div className="flex justify-center mb-6">
          <Logo size={64} />
        </div>
        <h2 className="text-center text-3xl font-bold text-emerald-400">Hoff Labs</h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          {generatedId ? 'Save your account number!' : 'Create an anonymous account. No email, no password.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-card py-8 px-6 sm:px-10 animate-fade-in-up stagger-2">
          {!generatedId ? (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Private by design</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    We'll generate a unique 16-digit account number. No email, no password, no personal data.
                    Your number is hashed on our servers — even we can't read it.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Random 16-digit number with built-in checksum</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>One-way encrypted storage — we never see the original</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Optional 2FA for extra security</span>
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                  <p className="text-sm text-rose-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="btn-primary w-full text-lg py-3"
              >
                {loading ? 'Generating...' : 'Generate My Account'}
              </button>

              <p className="text-center text-xs text-slate-600">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Account Created!</h3>
              </div>

              <div className="bg-slate-900 rounded-xl p-6 text-center border border-slate-700">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Your Account Number</p>
                <p className="text-3xl font-mono font-bold text-emerald-400 tracking-widest">
                  {formatNumber(generatedId)}
                </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm text-amber-400 font-medium">Save this number now!</p>
                <p className="text-xs text-slate-500 mt-1">
                  This is the only time you'll see your full account number. We don't store it — only a one-way hash.
                  If you lose it, you'll need to create a new account.
                </p>
              </div>

              <button
                onClick={handleCopy}
                className={`w-full py-3 rounded-lg text-sm font-medium transition-all border ${
                  copied
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                {copied ? 'Copied to clipboard!' : 'Copy Account Number'}
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="btn-primary w-full"
              >
                Continue to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

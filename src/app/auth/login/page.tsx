"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/app/components/Logo'

export default function LoginPage() {
  const [accountId, setAccountId] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Format input as XXXX XXXX XXXX XXXX
  const handleAccountInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
    setAccountId(formatted)
  }

  const getRawAccountId = () => accountId.replace(/\s/g, '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: getRawAccountId(),
          ...(requires2FA && { twoFactorCode }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.requires2FA) {
          setRequires2FA(true)
        } else {
          setError(data.error || 'Login failed')
        }
        return
      }

      router.push('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fade-in-up">
        <div className="flex justify-center mb-6">
          <Logo size={64} />
        </div>
        <h2 className="text-center text-3xl font-bold text-emerald-400">Hoff Labs</h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Enter your account number to sign in. Or{' '}
          <Link href="/auth/register" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            generate a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-card py-8 px-6 sm:px-10 animate-fade-in-up stagger-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="accountId" className="block text-xs font-medium text-slate-400 mb-1.5">
                Account Number
              </label>
              <input
                id="accountId"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                required
                value={accountId}
                onChange={(e) => handleAccountInput(e.target.value)}
                className="input-dark text-center text-2xl font-mono tracking-widest"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
              />
              <p className="text-xs text-slate-600 mt-1.5 text-center">
                16-digit number you received when creating your account
              </p>
            </div>

            {requires2FA && (
              <div>
                <label htmlFor="twoFactorCode" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Two-Factor Authentication Code
                </label>
                <input
                  id="twoFactorCode"
                  type="text"
                  inputMode="numeric"
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-dark text-center text-xl font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                <p className="text-sm text-rose-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || getRawAccountId().length !== 16}
              className="btn-primary w-full"
            >
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              No email or password needed. Your account number is your key.
              We only store a one-way hash — even we can't read the original.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

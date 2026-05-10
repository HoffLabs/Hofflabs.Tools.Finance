import PlaidLinkButton from '@/app/components/PlaidLinkButton'
import Link from 'next/link'

interface AccountSummaryProps {
  totalBalance: number
  accountCount: number
  syncing: boolean
  onSync: () => void
  formatCurrency: (amount: number) => string
}

export default function AccountSummary({
  totalBalance,
  accountCount,
  syncing,
  onSync,
  formatCurrency,
}: AccountSummaryProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-200">Account Summary</h2>
        <div className="flex gap-2">
          <button
            onClick={onSync}
            disabled={syncing}
            className={`text-sm px-3 py-1 rounded-md ${syncing ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'} text-white`}
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <Link
            href="/dashboard/settings"
            className="text-sm text-blue-400 hover:text-blue-800 py-1"
          >
            Settings
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-slate-400">Total Balance</p>
          <p className="text-2xl font-bold text-slate-100">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-slate-400">Accounts Connected</p>
          <p className="text-2xl font-bold text-slate-100">{accountCount}</p>
        </div>
        <br/>
      </div>
        <PlaidLinkButton />
    </div>
  )
}

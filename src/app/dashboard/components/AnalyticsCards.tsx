interface AnalyticsCardsProps {
  totalSpent: number
  totalIncome: number
  netFlow: number
  formatCurrency: (amount: number) => string
  timeLabel: string
}

export default function AnalyticsCards({
  totalSpent,
  totalIncome,
  netFlow,
  formatCurrency,
  timeLabel,
}: AnalyticsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
        <p className="text-sm font-medium text-red-700 mb-2">Total Spending</p>
        <p className="text-3xl font-bold text-red-900">
          {formatCurrency(totalSpent || 0)}
        </p>
        <p className="text-xs text-red-600 mt-1">{timeLabel}</p>
      </div>
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
        <p className="text-sm font-medium text-green-700 mb-2">Total Income</p>
        <p className="text-3xl font-bold text-green-900">
          {formatCurrency(totalIncome || 0)}
        </p>
        <p className="text-xs text-green-600 mt-1">{timeLabel}</p>
      </div>
      <div className={`bg-gradient-to-br ${netFlow < 0 ? 'from-orange-50 to-orange-100 border-orange-200' : 'from-blue-50 to-blue-100 border-blue-200'} rounded-xl p-6 border`}>
        <p className={`text-sm font-medium ${netFlow < 0 ? 'text-orange-700' : 'text-blue-700'} mb-2`}>Net Cash Flow</p>
        <p className={`text-3xl font-bold ${netFlow < 0 ? 'text-orange-900' : 'text-blue-900'}`}>
          {formatCurrency(netFlow || 0)}
        </p>
        <p className={`text-xs ${netFlow < 0 ? 'text-orange-600' : 'text-blue-600'} mt-1`}>{netFlow < 0 ? 'Deficit' : 'Surplus'}</p>
      </div>
    </div>
  )
}

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="glass-card hover-lift p-5 bg-gradient-to-br from-rose-600/20 to-rose-500/5 border-rose-500/20 animate-fade-in-up stagger-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Total Spending</p>
        <p className="text-2xl font-bold text-rose-400">{formatCurrency(totalSpent || 0)}</p>
        <p className="text-xs text-slate-500 mt-1">{timeLabel}</p>
      </div>
      <div className="glass-card hover-lift p-5 bg-gradient-to-br from-emerald-600/20 to-emerald-500/5 border-emerald-500/20 animate-fade-in-up stagger-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Total Income</p>
        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIncome || 0)}</p>
        <p className="text-xs text-slate-500 mt-1">{timeLabel}</p>
      </div>
      <div className={`glass-card hover-lift p-5 bg-gradient-to-br ${netFlow < 0 ? 'from-amber-600/20 to-amber-500/5 border-amber-500/20' : 'from-blue-600/20 to-blue-500/5 border-blue-500/20'} animate-fade-in-up stagger-3`}>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Net Cash Flow</p>
        <p className={`text-2xl font-bold ${netFlow < 0 ? 'text-amber-400' : 'text-blue-400'}`}>{formatCurrency(netFlow || 0)}</p>
        <p className="text-xs text-slate-500 mt-1">{netFlow < 0 ? 'Deficit' : 'Surplus'}</p>
      </div>
    </div>
  )
}

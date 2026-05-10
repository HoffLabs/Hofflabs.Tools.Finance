'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

interface DashboardChartsProps {
  analytics: {
    total_spent: number
    total_income: number
    net_flow: number
    category_breakdown: Array<{ name: string; spent: number; count?: number }>
    weekly_spending_by_day?: Record<string, number>
    monthly_spending_by_week?: Record<string, number>
    yearly_spending_by_month?: Record<string, number>
  }
  timeRange: string
  formatCurrency: (amount: number) => string
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

export default function DashboardCharts({
  analytics,
  timeRange,
  formatCurrency,
}: DashboardChartsProps) {
  // Prepare spending trend data based on time range
  const getSpendingTrendData = () => {
    if (timeRange === 'weekly' && analytics.weekly_spending_by_day) {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      return days.map(day => ({
        name: day,
        amount: analytics.weekly_spending_by_day?.[day] || 0,
      }))
    }
    if (timeRange === 'monthly' && analytics.monthly_spending_by_week) {
      return Object.entries(analytics.monthly_spending_by_week).map(([week, amount]) => ({
        name: week,
        amount,
      }))
    }
    if ((timeRange === 'yearly' || timeRange === 'lastyear') && analytics.yearly_spending_by_month) {
      const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      // For "This Year", only show months from Jan to current month
      // For "Last Year", show all 12 months
      let months = allMonths
      if (timeRange === 'yearly') {
        const currentMonth = new Date().getMonth() // 0-indexed
        months = allMonths.slice(0, currentMonth + 1)
      }
      
      return months.map(month => ({
        name: month,
        amount: analytics.yearly_spending_by_month?.[month] || 0,
      }))
    }
    return []
  }

  // Prepare category data for pie chart (top 6)
  const categoryData = (analytics.category_breakdown || [])
    .slice(0, 6)
    .map((cat, index) => ({
      name: cat.name,
      value: cat.spent,
      color: COLORS[index % COLORS.length],
    }))

  // Income vs Expenses data
  const incomeVsExpenses = [
    { name: 'Income', amount: analytics.total_income, fill: '#10B981' },
    { name: 'Expenses', amount: analytics.total_spent, fill: '#EF4444' },
  ]

  const spendingTrendData = getSpendingTrendData()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 p-2.5 rounded-lg shadow-xl">
          <p className="text-sm font-medium text-slate-200">{label}</p>
          <p className="text-sm text-slate-400">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Spending Trend Chart */}
      {spendingTrendData.length > 0 && (
        <div className="glass-card p-4 sm:p-5 animate-fade-in-up stagger-4">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 sm:mb-4">Spending Trend</h3>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#94A3B8' }} 
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#94A3B8' }} 
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3B82F6"
                  fill="#1E40AF"
                  fillOpacity={0.4}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Breakdown Pie Chart */}
      {categoryData.length > 0 && (
        <div className="glass-card p-4 sm:p-5 animate-fade-in-up stagger-5">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 sm:mb-4">Spending by Category</h3>
          <div className="h-48 sm:h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend 
                  layout="horizontal" 
                  align="center" 
                  verticalAlign="bottom"
                  formatter={(value) => <span className="text-[10px] sm:text-xs text-slate-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Income vs Expenses */}
      <div className="glass-card p-4 sm:p-5 lg:col-span-2 animate-fade-in-up stagger-6">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 sm:mb-4">Income vs Expenses</h3>
        <div className="h-36 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeVsExpenses} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12, fill: '#94A3B8' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12, fill: '#94A3B8' }}
                width={70}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={1000}>
                {incomeVsExpenses.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 sm:mt-4 flex flex-wrap justify-center gap-3 sm:gap-8 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-slate-400">Income: {formatCurrency(analytics.total_income)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-500"></div>
            <span className="text-slate-400">Expenses: {formatCurrency(analytics.total_spent)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold ${analytics.net_flow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              Net: {formatCurrency(analytics.net_flow)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

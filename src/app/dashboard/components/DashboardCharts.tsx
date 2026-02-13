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
        <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-gray-600">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Spending Trend Chart */}
      {spendingTrendData.length > 0 && (
        <div className="bg-white shadow rounded-lg p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Spending Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3B82F6"
                  fill="#93C5FD"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Breakdown Pie Chart */}
      {categoryData.length > 0 && (
        <div className="bg-white shadow rounded-lg p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Spending by Category</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
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
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Income vs Expenses */}
      <div className="bg-white shadow rounded-lg p-5 lg:col-span-2">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Income vs Expenses</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeVsExpenses} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                width={70}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {incomeVsExpenses.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Income: {formatCurrency(analytics.total_income)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Expenses: {formatCurrency(analytics.total_spent)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${analytics.net_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Net: {formatCurrency(analytics.net_flow)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

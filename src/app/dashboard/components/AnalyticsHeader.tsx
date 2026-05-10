interface AnalyticsHeaderProps {
  timeRange: string
  onTimeRangeChange: (range: string) => void
  customStartDate: string
  customEndDate: string
  onCustomStartDateChange: (date: string) => void
  onCustomEndDateChange: (date: string) => void
}

export default function AnalyticsHeader({
  timeRange,
  onTimeRangeChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
}: AnalyticsHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-200">Analytics Overview</h2>
        <select
          id="time-range"
          value={timeRange}
          onChange={(e) => onTimeRangeChange(e.target.value)}
          className="px-4 py-2 border border-slate-700 rounded-md  focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
        >
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
          <option value="yearly">This Year</option>
          <option value="lastyear">Last Year</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>
      
      {timeRange === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="custom-start-date" className="block text-sm font-medium text-slate-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="custom-start-date"
              value={customStartDate}
              onChange={(e) => onCustomStartDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-md  focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="custom-end-date" className="block text-sm font-medium text-slate-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="custom-end-date"
              value={customEndDate}
              onChange={(e) => onCustomEndDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-md  focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}

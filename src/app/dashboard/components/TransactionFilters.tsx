interface Account {
  id: string
  name: string
  mask: string
}

interface TransactionFiltersProps {
  accounts: Account[]
  selectedAccounts: string[]
  onSelectedAccountsChange: (accounts: string[]) => void
  dateRange: string
  onDateRangeChange: (range: string) => void
}

export default function TransactionFilters({
  accounts,
  selectedAccounts,
  onSelectedAccountsChange,
  dateRange,
  onDateRangeChange,
}: TransactionFiltersProps) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Transaction Filters</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Accounts
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedAccounts.length === 0}
                onChange={() => onSelectedAccountsChange([])}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">All Accounts</span>
            </label>
            {accounts.map((account) => (
              <label key={account.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAccounts.includes(account.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectedAccountsChange([...selectedAccounts, account.id])
                    } else {
                      onSelectedAccountsChange(selectedAccounts.filter(id => id !== account.id))
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{account.name} ({account.mask})</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <select
            id="date-range"
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="120">Last 120 Days</option>
            <option value="365">Last 1 Year</option>
            <option value="730">Last 2 Years</option>
            <option value="1095">Last 3 Years</option>
            <option value="1825">Last 5 Years</option>
          </select>
        </div>
      </div>
    </div>
  )
}

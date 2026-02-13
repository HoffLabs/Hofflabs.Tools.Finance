interface Account {
  id: string
  name: string
  type: string
  subtype?: string
  mask: string
  balance: number
  available_balance: number
  currency: string
}

interface ConnectedAccountsProps {
  accounts: Account[]
  formatCurrency: (amount: number) => string
  onRemoveAccount: (accountId: string) => Promise<void>
}

export default function ConnectedAccounts({
  accounts,
  formatCurrency,
  onRemoveAccount,
}: ConnectedAccountsProps) {
  if (accounts.length === 0) return null

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Connected Accounts
      </h2>

      <div className="space-y-4">
        {accounts.map((account) => {
          // Determine account type colors and icons
          let bgColor = 'bg-blue-100'
          let textColor = 'text-blue-600'
          let accountTypeLabel = account.type

          // Customize based on account type and subtype
          if (account.type === 'depository') {
            if (account.subtype === 'checking') {
              bgColor = 'bg-blue-100'
              textColor = 'text-blue-600'
              accountTypeLabel = 'Checking Account'
            } else if (account.subtype === 'savings') {
              bgColor = 'bg-green-100'
              textColor = 'text-green-600'
              accountTypeLabel = 'Savings Account'
            }
          } else if (account.type === 'credit') {
            bgColor = 'bg-purple-100'
            textColor = 'text-purple-600'
            accountTypeLabel = 'Credit Card'
          } else if (account.type === 'loan') {
            bgColor = 'bg-yellow-100'
            textColor = 'text-yellow-600'
            accountTypeLabel = 'Loan Account'
          } else if (account.type === 'investment') {
            bgColor = 'bg-indigo-100'
            textColor = 'text-indigo-600'
            accountTypeLabel = 'Investment Account'
          }

          return (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center`}
                >
                  <span className={`${textColor} font-semibold text-sm`}>
                    {account.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>

                <div>
                  <p className="font-medium text-gray-900">{account.name}</p>
                  <p className="text-sm text-gray-500">
                    {accountTypeLabel} • {account.mask} • {account.currency}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(account.balance ? Number(account.balance) : 0)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Available:{' '}
                    {formatCurrency(
                      account.available_balance
                        ? Number(account.available_balance)
                        : 0
                    )}
                  </p>
                </div>

                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to remove this account?')) {
                      await onRemoveAccount(account.id)
                    }
                  }}
                  className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Convert a dollar amount into hours/minutes of life worked.
 * Assumes ~160 working hours per month (40hr/week).
 */
export function getTimeCost(amount: number, monthlyIncome: number): { hours: number; minutes: number; label: string } {
  if (monthlyIncome <= 0) return { hours: 0, minutes: 0, label: '??' }
  const hourlyRate = monthlyIncome / 160
  const totalHours = Math.abs(amount) / hourlyRate
  const hours = Math.floor(totalHours)
  const minutes = Math.round((totalHours - hours) * 60)

  if (hours === 0 && minutes === 0) return { hours: 0, minutes: 1, label: '<1m of your life' }
  if (hours === 0) return { hours: 0, minutes, label: `${minutes}m of your life` }
  if (hours >= 24) {
    const days = Math.floor(hours / 8) // work days
    return { hours, minutes, label: `${days} work day${days !== 1 ? 's' : ''} of your life` }
  }
  return { hours, minutes, label: `${hours}h ${minutes}m of your life` }
}

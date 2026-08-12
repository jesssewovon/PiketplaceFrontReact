export function formatAmount(value: number | string | undefined | null, currency?: string): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0'
  const formatted = num.toLocaleString(undefined, { maximumFractionDigits: 7 })
  return currency ? `${formatted} ${currency}` : formatted
}

export function formatDate(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

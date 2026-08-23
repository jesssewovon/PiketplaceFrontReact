import type { CancellationReason } from '../types'

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

export function normalizeCancellationReasons(
  raw:
    | CancellationReason[]
    | Record<string, CancellationReason[]>
    | null
    | undefined,
  locale: string,
): CancellationReason[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const byLocale = raw as Record<string, CancellationReason[] | undefined>
    const lang = locale.split('-')[0]
    const list = byLocale[lang] ?? byLocale.en ?? Object.values(byLocale).find((v) => Array.isArray(v))
    return Array.isArray(list) ? list : []
  }
  return []
}

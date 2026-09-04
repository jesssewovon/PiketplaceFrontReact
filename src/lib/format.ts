import type { CancellationReason } from '../types'

function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&euro;|&eacute;|€|&pound;|£|\$/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatAmount(value: number | string | undefined | null, currency?: string): string {
  const source = typeof value === 'string' ? stripMarkup(value) : value
  const num = Number(source)
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

export function formatDateTime(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const time = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  return `${day} ${time}`
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

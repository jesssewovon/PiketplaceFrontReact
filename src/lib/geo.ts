const LANGUAGE_FALLBACKS: Record<string, string> = {
  en: 'US',
  fr: 'FR',
  de: 'DE',
  es: 'ES',
  it: 'IT',
  pt: 'PT',
  nl: 'NL',
  ru: 'RU',
  zh: 'CN',
  ja: 'JP',
  ko: 'KR',
  ar: 'AE',
  hi: 'IN',
  id: 'ID',
  tr: 'TR',
  pl: 'PL',
  sw: 'KE',
  yo: 'NG',
  ig: 'NG',
  ha: 'NG',
  ph: 'PH',
  th: 'TH',
  vi: 'VN',
}

export function getCountryCode(): string {
  if (typeof navigator === 'undefined') return 'US'
  const parts = (navigator.language || '').split('-')
  const region = parts[1]
  if (region && region.length === 2) return region.toUpperCase()
  const base = parts[0]?.toLowerCase()
  return LANGUAGE_FALLBACKS[base ?? ''] ?? 'US'
}

export function flagEmoji(countryCode: string): string {
  const upper = countryCode.toUpperCase()
  if (upper.length !== 2) return '🌐'
  const REGIONAL_INDICATOR_OFFSET = 0x1f1a5
  return String.fromCodePoint(
    ...[...upper].map((char) => char.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET),
  )
}

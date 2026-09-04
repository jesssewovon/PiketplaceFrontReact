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

const COUNTRY_STORAGE_KEY = 'piketplace_user_country'

export function getStoredCountryCode(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const value = localStorage.getItem(COUNTRY_STORAGE_KEY)
    return value && value.length === 2 ? value.toUpperCase() : null
  } catch {
    return null
  }
}

export function storeCountryCode(code: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    const upper = code.toUpperCase()
    if (upper.length === 2) localStorage.setItem(COUNTRY_STORAGE_KEY, upper)
  } catch {
    return
  }
}

export function clearCountryCode(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(COUNTRY_STORAGE_KEY)
  } catch {
    return
  }
}

export async function detectCountryByGeolocation(): Promise<string> {
  const fallback = getCountryCode()
  if (typeof navigator === 'undefined' || !navigator.geolocation) return fallback
  return new Promise<string>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        fetch(url, { headers: { Accept: 'application/json' } })
          .then((response) => response.json())
          .then((data) => {
            const code = (data as { address?: { country_code?: string } }).address?.country_code ?? ''
            resolve(code && code.length === 2 ? code.toUpperCase() : fallback)
          })
          .catch(() => resolve(fallback))
      },
      () => resolve(fallback),
      { timeout: 10000, maximumAge: 0 },
    )
  })
}

export function flagEmoji(countryCode: string): string {
  const upper = countryCode.toUpperCase()
  if (upper.length !== 2) return '🌐'
  const REGIONAL_INDICATOR_OFFSET = 0x1f1a5
  return String.fromCodePoint(
    ...[...upper].map((char) => char.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET),
  )
}

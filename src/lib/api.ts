import type { PaginatedResponse, NewProductPayload } from '../types'
import { syncSettingsFromPayload } from '../store/settingsSync'
import { syncAttributesFromPayload } from '../store/attributesSync'

export const API_BASE =
  (import.meta.env.VITE_APP_BACKEND_URL as string | undefined) ??
  'https://mainnet-backend.piketplace.com/api/v1'

export const PUBLISH_ENDPOINT =
  (import.meta.env.VITE_PUBLISH_ENDPOINT as string | undefined) ?? '/products'

export interface ProductCategory {
  id: number
  code: string
  libelle?: string
  libelleEn?: string
  description?: string
  img?: string
  icons?: string
}

export async function fetchCategories(): Promise<ProductCategory[]> {
  const response = await fetch(`${API_BASE}/livesearch-category`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to load categories (${response.status})`)
  }

  return (await response.json()) as ProductCategory[]
}

function parseCities(data: unknown): string[] {
  const pick = (value: unknown): string | null => {
    if (typeof value === 'string') return value
    if (value && typeof value === 'object') {
      const item = value as Record<string, unknown>
      for (const key of ['name', 'libelle', 'value', 'city'] as const) {
        if (typeof item[key] === 'string' && item[key]) return item[key]
      }
    }
    return null
  }
  if (Array.isArray(data)) {
    return data.map(pick).filter((city): city is string => typeof city === 'string' && city.length > 0)
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    for (const key of ['cities', 'data', 'results'] as const) {
      if (Array.isArray(record[key])) {
        const list = record[key].map(pick).filter((city): city is string => typeof city === 'string' && city.length > 0)
        if (list.length > 0) return list
      }
    }
  }
  return []
}

export async function fetchCitiesByCountry(countryCode: string): Promise<string[]> {
  const response = await fetch(
    `${API_BASE}/get-cities-by-country/${encodeURIComponent(countryCode)}`,
    { headers: { Accept: 'application/json' } },
  )

  if (!response.ok) {
    throw new Error(`Failed to load cities (${response.status})`)
  }

  return parseCities(await response.json())
}

export async function fetchProducts(page = 1): Promise<PaginatedResponse> {
  const response = await fetch(`${API_BASE}/index-loading?page=${page}`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to load products (${response.status})`)
  }

  const data = (await response.json()) as PaginatedResponse
  syncSettingsFromPayload(data)
  syncAttributesFromPayload(data)
  return data
}

export async function createProduct(payload: NewProductPayload): Promise<unknown> {
  const formData = new FormData()
  formData.append('category_selected_id', payload.category_selected_id)
  formData.append('libelle', payload.libelle)
  formData.append('description', payload.description)
  formData.append('price', payload.price)
  formData.append('quantity', payload.quantity)
  formData.append('address', payload.address)
  formData.append('country_code', payload.country_code)
  formData.append('city', payload.city)
  formData.append('email', payload.email)
  formData.append('is_digital', payload.is_digital ? '1' : '0')
  formData.append('shipping_zone', payload.shipping_zone)
  formData.append('free_shipping', payload.free_shipping ? '1' : '0')
  formData.append('free_shipping_zone', payload.free_shipping_zone)
  formData.append('promotion_fees_activated', payload.promotion_fees_activated ? '1' : '0')
  formData.append('promotion_fees_percentage', payload.promotion_fees_percentage)
  formData.append('product_available', payload.product_available ? '1' : '0')
  formData.append('saling_terms_agreements', payload.saling_terms_agreements ? '1' : '0')
  payload.images.forEach((file) => formData.append('images[]', file))

  const response = await fetch(`${API_BASE}${PUBLISH_ENDPOINT}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  })

  if (!response.ok) {
    let message = `Failed to publish product (${response.status})`
    try {
      const data = (await response.json()) as { message?: string }
      if (data.message) message = data.message
    } catch {
      // keep default message when body is not JSON
    }
    throw new Error(message)
  }

  const data = (await response.json().catch(() => ({}))) as unknown
  syncAttributesFromPayload(data)
  return data
}

export interface SigninResponse {
  status?: string
  message?: string
  data?: unknown
  token?: string
  access_token?: string
  user?: PiUser
  permissions?: unknown
  [key: string]: unknown
}

export async function signIn(authResult: PiAuthResult): Promise<SigninResponse> {
  const response = await fetch(`${API_BASE}/signin`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ authResult }),
  })

  const data = (await response.json().catch(() => ({}))) as SigninResponse
  if (!response.ok) {
    throw new Error(data.message ?? `Authentication failed (${response.status})`)
  }
  syncSettingsFromPayload(data)
  syncAttributesFromPayload(data)
  return data
}

export interface MiningResponse {
  status?: string
  message?: string
  mining_remaining_time?: number
  wallet_user?: {
    mining_data?: {
      mining_rate?: number
    }
  }
  [key: string]: unknown
}

export async function checkMining(token?: string): Promise<MiningResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_BASE}/check-mining`, { headers })
  if (!response.ok) {
    throw new Error(`Failed to check mining (${response.status})`)
  }
  const data = (await response.json()) as MiningResponse
  syncSettingsFromPayload(data)
  syncAttributesFromPayload(data)
  return data
}

export async function startMining(token?: string): Promise<MiningResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_BASE}/mining`, { method: 'POST', headers })
  if (!response.ok) {
    throw new Error(`Failed to start mining (${response.status})`)
  }
  const data = (await response.json()) as MiningResponse
  syncSettingsFromPayload(data)
  syncAttributesFromPayload(data)
  return data
}

export async function signOut(token?: string): Promise<void> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    await fetch(`${API_BASE}/signout`, { method: 'POST', headers })
  } catch {
    // local logout must proceed even if the server is unreachable
  }
}

import type {
  PaginatedResponse,
  NewProductPayload,
  MyProductsResponse,
  StoreData,
  SalesResponse,
  OrdersResponse,
  CancellationReason,
  MessageContactsResponse,
  PartnershipsResponse,
  AdsDataResponse,
  AdsHistoriesResponse,
  RewardAdsResponse,
  PartnerAccountResponse,
  PartnerOrdersResponse,
  DonationResponse,
  PaymentVerifierResponse,
  AddressesResponse,
  ShippingAddress,
  ProductDetailResponse,
  BoostResponse,
  AddToCartPayload,
  Product,
} from '../types'
import { syncSettingsFromPayload } from '../store/settingsSync'
import { syncAttributesFromPayload } from '../store/attributesSync'
import { authFetch } from './authFetch'

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

function authHeaders(token?: string, uid?: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (uid) headers.useruid = uid
  return headers
}

export async function fetchMyStoreData(token: string | undefined): Promise<StoreData> {
  const response = await authFetch(`${API_BASE}/category/products`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load store data (${response.status})`)
  }
  return (await response.json()) as StoreData
}

export async function fetchMyProducts(
  token: string | undefined,
  page = 1,
): Promise<MyProductsResponse> {
  const response = await authFetch(`${API_BASE}/my-products?page=${page}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load my products (${response.status})`)
  }
  const data = (await response.json()) as MyProductsResponse
  syncAttributesFromPayload(data)
  return data
}

export async function updateProductVisibility(
  token: string | undefined,
  productId: number,
  forceHide = false,
): Promise<{ status?: boolean; message?: string; product?: unknown }> {
  const response = await authFetch(`${API_BASE}/update-product-visibility`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, force_hide: forceHide }),
  })
  const data = (await response.json().catch(() => ({}))) as {
    status?: boolean
    message?: string
    product?: unknown
  }
  if (!response.ok) {
    throw new Error(data.message ?? `Failed to update product visibility (${response.status})`)
  }
  return data
}

export async function addStock(
  token: string | undefined,
  productsId: number,
  quantity: number,
): Promise<{ status?: boolean; product?: unknown }> {
  const response = await authFetch(`${API_BASE}/add-stock`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ products_id: productsId, quantity }),
  })
  const data = (await response.json().catch(() => ({}))) as { status?: boolean; product?: unknown }
  if (!response.ok) {
    throw new Error(`Failed to add stock (${response.status})`)
  }
  return data
}

export async function submitForReview(
  token: string | undefined,
  productId: number,
): Promise<{ status?: boolean }> {
  const response = await authFetch(`${API_BASE}/submit-for-review/${productId}`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = (await response.json().catch(() => ({}))) as { status?: boolean }
  if (!response.ok) {
    throw new Error(`Failed to submit for review (${response.status})`)
  }
  return data
}

export async function fetchProduct(
  id: number,
  token?: string,
): Promise<ProductDetailResponse> {
  const endpoint = token ? `/products/${id}` : `/${id}/products`
  const response = await authFetch(`${API_BASE}${endpoint}`, { headers: authHeaders(token) })
  if (!response.ok) {
    throw new Error(`Failed to load product (${response.status})`)
  }
  const data = (await response.json()) as ProductDetailResponse
  syncSettingsFromPayload(data)
  syncAttributesFromPayload(data)
  return data
}

export async function deleteProduct(
  token: string | undefined,
  productId: number,
): Promise<{ status?: boolean; message?: string }> {
  const response = await authFetch(`${API_BASE}/products/${productId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = (await response.json().catch(() => ({}))) as { status?: boolean; message?: string }
  if (!response.ok) {
    throw new Error(`Failed to delete product (${response.status})`)
  }
  return data
}

export interface BoostPayload {
  amount: string
  currencies_code?: string
  period?: string
  products_id?: number
  status?: string
  code_pin?: string
}

export async function boostProduct(
  token: string | undefined,
  payload: BoostPayload,
): Promise<BoostResponse> {
  const response = await authFetch(`${API_BASE}/boost-products`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => ({}))) as BoostResponse
  if (!response.ok) {
    throw new Error(`Failed to boost product (${response.status})`)
  }
  return data
}

export async function upgradeBoostProduct(
  token: string | undefined,
  payload: BoostPayload,
): Promise<BoostResponse> {
  const response = await authFetch(`${API_BASE}/upgrade-boost-products`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => ({}))) as BoostResponse
  if (!response.ok) {
    throw new Error(`Failed to upgrade product boost (${response.status})`)
  }
  return data
}

export async function addToCart(
  token: string | undefined,
  payload: AddToCartPayload,
): Promise<{ status?: string | boolean; message?: string }> {
  const response = await authFetch(`${API_BASE}/addToCart`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => ({}))) as {
    status?: string | boolean
    message?: string
  }
  if (!response.ok) {
    throw new Error(`Failed to add to cart (${response.status})`)
  }
  return data
}

export async function updatePromotionActivation(
  token: string | undefined,
  product: Product,
): Promise<{ status?: boolean; message?: string; product?: Product }> {
  const response = await authFetch(`${API_BASE}/update-promotion-activation`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...product, products_id: product.id }),
  })
  const data = (await response.json().catch(() => ({}))) as {
    status?: boolean
    message?: string
    product?: Product
  }
  if (!response.ok) {
    throw new Error(`Failed to update promotion activation (${response.status})`)
  }
  return data
}

export async function validateProduct(
  token: string | undefined,
  productId: number,
  status: string,
  reasons?: string[],
): Promise<{ status?: boolean; message?: string }> {
  const body = status === 'validated' ? { status } : { status, reasons }
  const response = await authFetch(`${API_BASE}/validate-product/${productId}`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as { status?: boolean; message?: string }
  if (!response.ok) {
    throw new Error(`Failed to validate product (${response.status})`)
  }
  return data
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function postComment(
  token: string | undefined,
  payload: { comment: string; products_id: number; pi_users_id?: number },
): Promise<{ status?: boolean; message?: string; product?: Product; comments?: unknown }> {
  const response = await authFetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => ({}))) as {
    status?: boolean
    message?: string
    product?: Product
    comments?: unknown
  }
  if (!response.ok) {
    throw new Error(`Failed to post comment (${response.status})`)
  }
  return data
}

export interface SalesQuery {
  seller_id: number
  shipped?: string
  page?: number
  reference?: string
}

export async function fetchSales(
  token: string | undefined,
  params: SalesQuery,
): Promise<SalesResponse> {
  const search = new URLSearchParams()
  search.set('seller_id', String(params.seller_id))
  if (params.shipped) search.set('shipped', params.shipped)
  if (params.page) search.set('page', String(params.page))
  if (params.reference) search.set('reference', params.reference)
  const response = await authFetch(`${API_BASE}/get-sales?${search.toString()}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load sales (${response.status})`)
  }
  const data = (await response.json()) as SalesResponse
  syncSettingsFromPayload(data)
  syncAttributesFromPayload(data)
  return data
}

export interface OrdersQuery {
  user_id: number
  page?: number
  reference?: string
}

export async function fetchOrders(
  token: string | undefined,
  params: OrdersQuery,
): Promise<OrdersResponse> {
  const search = new URLSearchParams()
  search.set('user_id', String(params.user_id))
  search.set('type', 'in_progress')
  if (params.page) search.set('page', String(params.page))
  if (params.reference) search.set('reference', params.reference)
  const response = await authFetch(`${API_BASE}/orders?${search.toString()}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load orders (${response.status})`)
  }
  const data = (await response.json()) as OrdersResponse
  syncSettingsFromPayload(data)
  syncAttributesFromPayload(data)
  return data
}

export async function fetchShippedOrders(
  token: string | undefined,
  params: OrdersQuery,
): Promise<OrdersResponse> {
  const search = new URLSearchParams()
  search.set('user_id', String(params.user_id))
  if (params.page) search.set('page', String(params.page))
  if (params.reference) search.set('reference', params.reference)
  const response = await authFetch(`${API_BASE}/shipped-line-orders?${search.toString()}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load shipped orders (${response.status})`)
  }
  const data = (await response.json()) as OrdersResponse
  syncSettingsFromPayload(data)
  syncAttributesFromPayload(data)
  return data
}

export async function updateLineOrder(
  token: string | undefined,
  lineOrderId: number,
  data: { type: string; reasons?: CancellationReason[] | null },
): Promise<{ status?: boolean; message?: string; line_order?: unknown }> {
  const response = await authFetch(`${API_BASE}/line-orders-api/${lineOrderId}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = (await response.json().catch(() => ({}))) as {
    status?: boolean
    message?: string
    line_order?: unknown
  }
  if (!response.ok) {
    throw new Error(result.message ?? `Failed to update line order (${response.status})`)
  }
  return result
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
  const response = await authFetch(`${API_BASE}/check-mining`, { headers })
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
  const response = await authFetch(`${API_BASE}/mining`, { method: 'POST', headers })
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
    await authFetch(`${API_BASE}/signout`, { method: 'POST', headers })
  } catch {
    // local logout must proceed even if the server is unreachable
  }
}

export interface MessageContactsQuery {
  page?: number
  search?: string
}

export async function fetchMessageContacts(
  token: string | undefined,
  params: MessageContactsQuery,
): Promise<MessageContactsResponse> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.search) search.set('search', params.search)
  const response = await authFetch(`${API_BASE}/message-contacts?${search.toString()}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load message contacts (${response.status})`)
  }
  return (await response.json()) as MessageContactsResponse
}

export async function fetchPartnerships(
  token: string | undefined,
): Promise<PartnershipsResponse> {
  const response = await authFetch(`${API_BASE}/get-partnerships`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load partnerships (${response.status})`)
  }
  return (await response.json()) as PartnershipsResponse
}

export async function fetchAdsData(
  token: string | undefined,
  failedRewardedAds: unknown[] = [],
): Promise<AdsDataResponse> {
  const response = await authFetch(
    `${API_BASE}/load-ads-data?failed_rewarded_ads=${encodeURIComponent(
      JSON.stringify(failedRewardedAds),
    )}`,
    { headers: authHeaders(token) },
  )
  if (!response.ok) {
    throw new Error(`Failed to load ads data (${response.status})`)
  }
  const data = (await response.json()) as AdsDataResponse
  syncAttributesFromPayload(data)
  return data
}

export async function fetchAdsHistories(
  token: string | undefined,
  page = 1,
): Promise<AdsHistoriesResponse> {
  const response = await authFetch(`${API_BASE}/load-pi-ads-histories?page=${page}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load ads histories (${response.status})`)
  }
  return (await response.json()) as AdsHistoriesResponse
}

export async function rewardUserAds(
  token: string | undefined,
  adId: string,
  failedRewardedAds: unknown[] = [],
): Promise<RewardAdsResponse> {
  const response = await authFetch(`${API_BASE}/reward-user-ads`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ adId, failed_rewarded_ads: failedRewardedAds }),
  })
  const data = (await response.json().catch(() => ({}))) as RewardAdsResponse
  if (!response.ok) {
    throw new Error(data.message ?? `Failed to reward user ads (${response.status})`)
  }
  return data
}

export async function fetchPartnerAccount(
  token: string | undefined,
): Promise<PartnerAccountResponse> {
  const response = await authFetch(`${API_BASE}/partner/get-partner-account`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load partner account (${response.status})`)
  }
  return (await response.json()) as PartnerAccountResponse
}

export async function fetchPartnerOrders(
  token: string | undefined,
  requestType: string,
  page = 1,
): Promise<PartnerOrdersResponse> {
  const search = new URLSearchParams()
  search.set('page', String(page))
  search.set('request_type', requestType)
  const response = await authFetch(`${API_BASE}/partner/get-orders-partner?${search.toString()}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load partner orders (${response.status})`)
  }
  const data = (await response.json()) as PartnerOrdersResponse
  syncSettingsFromPayload(data)
  syncAttributesFromPayload(data)
  return data
}

export async function donateToPiketplaceWallet(
  token: string | undefined,
  userId: number,
  amount: string,
  codePin: string,
): Promise<DonationResponse> {
  const response = await authFetch(`${API_BASE}/donate-piketplace-wallet`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, amount, code_pin: codePin }),
  })
  const data = (await response.json().catch(() => ({}))) as DonationResponse
  if (!response.ok) {
    throw new Error(data.message ?? `Failed to donate (${response.status})`)
  }
  return data
}

export async function verifyPayment(
  token: string | undefined,
  uniqueId: string,
  userId?: number,
): Promise<PaymentVerifierResponse> {
  const response = await authFetch(`${API_BASE}/payment-verifier`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ uniqueId, userId }),
  })
  const data = (await response.json().catch(() => ({}))) as PaymentVerifierResponse
  if (!response.ok) {
    throw new Error(`Failed to verify payment (${response.status})`)
  }
  return data
}

export async function postPiPayment(
  token: string | undefined,
  uid: string | undefined,
  endpoint: 'approve' | 'complete' | 'incomplete',
  payload: Record<string, unknown>,
): Promise<unknown> {
  const response = await authFetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      ...authHeaders(token, uid),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Failed to ${endpoint} payment (${response.status})`)
  }
  return response.json().catch(() => ({}))
}

export async function fetchMyAddresses(
  token: string | undefined,
): Promise<AddressesResponse> {
  const response = await authFetch(`${API_BASE}/get-my-addresses`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load addresses (${response.status})`)
  }
  return (await response.json()) as AddressesResponse
}

export async function saveAddress(
  token: string | undefined,
  address: ShippingAddress,
): Promise<AddressesResponse> {
  const response = await authFetch(`${API_BASE}/save-address`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  })
  const data = (await response.json().catch(() => ({}))) as AddressesResponse
  if (!response.ok) {
    throw new Error(`Failed to save address (${response.status})`)
  }
  return data
}

export async function deleteAddress(
  token: string | undefined,
  index: number,
): Promise<AddressesResponse> {
  const response = await authFetch(`${API_BASE}/delete-address`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ index }),
  })
  const data = (await response.json().catch(() => ({}))) as AddressesResponse
  if (!response.ok) {
    throw new Error(`Failed to delete address (${response.status})`)
  }
  return data
}

export async function setAddressAsDefault(
  token: string | undefined,
  index: number,
): Promise<AddressesResponse> {
  const response = await authFetch(`${API_BASE}/set-address-as-default`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ index }),
  })
  const data = (await response.json().catch(() => ({}))) as AddressesResponse
  if (!response.ok) {
    throw new Error(`Failed to set default address (${response.status})`)
  }
  return data
}

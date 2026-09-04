import type {
  PaginatedResponse,
  NewProductPayload,
  UpdateProductPayload,
  MyProductsResponse,
  StoreData,
  SalesResponse,
  OrdersResponse,
  CancellationReason,
  MessageContactsResponse,
  MessagesFetchResponse,
  NewMessagesFetchResponse,
  OldMessagesFetchResponse,
  SendMessageResponse,
  PartnershipsResponse,
  AdsDataResponse,
  AdsHistoriesResponse,
  RewardAdsResponse,
  PartnerAccountResponse,
  PartnerOrdersResponse,
  PartnersPaymentResponse,
  PartnerWalletAddressResponse,
  DonationResponse,
  PaymentVerifierResponse,
  AddressesResponse,
  ShippingAddress,
  ProductDetailResponse,
  BoostResponse,
  AddToCartPayload,
  Product,
  CartBuyNowResponse,
  ConfirmCartPayload,
  ConfirmCartResponse,
  PiketplaceWalletPaymentPayload,
  PiketplaceWalletPaymentResponse,
  SearchDeliveryCompaniesPayload,
  SearchDeliveryCompaniesResponse,
  ReferredUsersResponse,
  SettingsUserResponse,
  LineOrderResponse,
  SaveShippingImagesPayload,
  SaveShippingImagesResponse,
  FileStoreResponse,
  ProfilResponse,
  DeliveryPenalitiesDataResponse,
  NotificationsResponse,
  AdministrationResponse,
  AdminProductsResponse,
  AdminSettingItem,
  AdminOrdersResponse,
  AdminUsersResponse,
  PreOrdersResponse,
  AdminWithdrawalsResponse,
  WalletBalanceDetailsData,
  UserShopResponse,
} from '../types'
import type { FilterState } from './filterState'
import { syncSettingsFromPayload } from '../store/settingsSync'
import { syncAttributesFromPayload } from '../store/attributesSync'
import { syncUserFromPayload } from '../store/userSync'
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
  const keepUnique = (list: (string | null)[]): string[] => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const city of list) {
      if (typeof city === 'string' && city.length > 0 && !seen.has(city)) {
        seen.add(city)
        result.push(city)
      }
    }
    return result
  }
  if (Array.isArray(data)) {
    return keepUnique(data.map(pick))
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    for (const key of ['cities', 'data', 'results'] as const) {
      if (Array.isArray(record[key])) {
        const list = keepUnique(record[key].map(pick))
        if (list.length > 0) return list
      }
    }
  }
  return []
}

const CITIES_CACHE_KEY = 'piketplace_cities_cache'

const citiesCache = new Map<string, string[]>()

function readCitiesCache(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(CITIES_CACHE_KEY) ?? '{}') as Record<string, string[]>
  } catch {
    return {}
  }
}

function writeCitiesCache(cache: Record<string, string[]>) {
  try {
    localStorage.setItem(CITIES_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // storage not available (private mode, SSR, quota) – in-memory cache still works
  }
}

export async function fetchCitiesByCountry(countryCode: string): Promise<string[]> {
  const key = countryCode.trim()
  const cached = citiesCache.get(key)
  if (cached) return cached

  const persisted = readCitiesCache()[key]
  if (Array.isArray(persisted)) {
    citiesCache.set(key, persisted)
    return persisted
  }

  const response = await fetch(
    `${API_BASE}/get-cities-by-country/${encodeURIComponent(key)}`,
    { headers: { Accept: 'application/json' } },
  )

  if (!response.ok) {
    throw new Error(`Failed to load cities (${response.status})`)
  }

  const list = parseCities(await response.json())
  citiesCache.set(key, list)
  writeCitiesCache({ ...readCitiesCache(), [key]: list })
  return list
}

export interface FetchProductsOptions {
  filter?: FilterState
  locale?: string
  connected_user_id?: string | number
}

export async function fetchProducts(
  page = 1,
  options: FetchProductsOptions = {},
): Promise<PaginatedResponse> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('status', 'validated')
  params.set('verified_shops', '1')
  if (options.locale) params.set('locale', options.locale)
  if (options.connected_user_id) params.set('connected_user_id', String(options.connected_user_id))
  if (options.filter) {
    const filter = options.filter
    if (filter.search) params.set('search', filter.search)
    params.set('filter[iso2]', filter.iso2)
    params.set('filter[iso3]', filter.iso3)
    params.set('filter[search]', filter.search)
    params.set('filter[show_products_type]', filter.productType)
    params.set('filter[sort_by]', filter.sortBy)
    if (filter.category) params.set('filter[category]', String(filter.category))
    params.set('filter[is_updated]', filter.isUpdated ? '1' : '0')
  }
  const response = await fetch(`${API_BASE}/index-loading?${params.toString()}`, {
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

export async function getUserShop(
  shopUserId: number,
  token?: string,
): Promise<UserShopResponse> {
  const response = await fetch(`${API_BASE}/get-user-shop/${shopUserId}`, {
    headers: { Accept: 'application/json', ...authHeaders(token) },
  })
  if (!response.ok) {
    throw new Error(`Failed to load shop (${response.status})`)
  }
  const json = (await response.json()) as UserShopResponse
  return json
}

export async function fetchShopProducts(
  page: number,
  shopUserId: number,
): Promise<PaginatedResponse> {
  const response = await fetch(
    `${API_BASE}/index-loading?page=${page}&status=validated&shop_user_id=${shopUserId}`,
    { headers: { Accept: 'application/json' } },
  )
  if (!response.ok) {
    throw new Error(`Failed to load products (${response.status})`)
  }
  const data = (await response.json()) as PaginatedResponse
  syncSettingsFromPayload(data)
  syncAttributesFromPayload(data)
  return data
}

export async function createProduct(payload: NewProductPayload, token?: string): Promise<unknown> {
  const formData = new FormData()
  formData.append('categories_id', payload.categories_id)
  formData.append('libelle', payload.libelle)
  formData.append('description', payload.description)
  formData.append('price', payload.price)
  formData.append('quantity', payload.quantity)
  formData.append('address', payload.address)
  formData.append('country_code', payload.country_code)
  formData.append('city', payload.city)
  formData.append('email', payload.email)
  formData.append('is_digital', payload.is_digital ? '1' : '0')
  payload.shipping_zone.forEach((zone, index) => {
    Object.entries(zone).forEach(([key, value]) => formData.append(`shipping_zone[${index}][${key}]`, String(value ?? '')))
  })
  formData.append('free_shipping', payload.free_shipping ? '1' : '0')
  payload.free_shipping_zone.forEach((zone, index) => {
    Object.entries(zone).forEach(([key, value]) => formData.append(`free_shipping_zone[${index}][${key}]`, String(value ?? '')))
  })
  formData.append('promotion_fees_activated', payload.promotion_fees_activated ? '1' : '0')
  formData.append('promotion_fees_percentage', payload.promotion_fees_percentage)
  formData.append('product_available', payload.product_available ? '1' : '0')
  formData.append('saling_terms_agreements', payload.saling_terms_agreements ? '1' : '0')
  payload.images.forEach((file) => formData.append('images[]', file))
  console.log('FormData entries:', payload.images, Array.from(formData.entries())) // Log FormData entries for debugging
  const response = await authFetch(`${API_BASE}${PUBLISH_ENDPOINT}`, {
    method: 'POST',
    headers: authHeaders(token),
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

export async function updateProduct(
  productId: number,
  payload: UpdateProductPayload,
  token?: string,
): Promise<{ status?: boolean; message?: string; approbation?: boolean; product?: unknown }> {
  const formData = new FormData()
  formData.append('categories_id', payload.categories_id)
  formData.append('libelle', payload.libelle)
  formData.append('description', payload.description)
  formData.append('price', payload.price)
  formData.append('price_str', payload.price)
  formData.append('quantity', payload.quantity)
  formData.append('address', payload.address)
  formData.append('country_code', payload.country_code)
  formData.append('city', payload.city)
  formData.append('email', payload.email)
  formData.append('is_digital', payload.is_digital ? '1' : '0')
  payload.shipping_zone.forEach((zone, index) => {
    Object.entries(zone).forEach(([key, value]) => formData.append(`shipping_zone[${index}][${key}]`, String(value ?? '')))
  })
  formData.append('free_shipping', payload.free_shipping ? '1' : '0')
  payload.free_shipping_zone.forEach((zone, index) => {
    Object.entries(zone).forEach(([key, value]) => formData.append(`free_shipping_zone[${index}][${key}]`, String(value ?? '')))
  })
  formData.append('promotion_fees_activated', payload.promotion_fees_activated ? '1' : '0')
  formData.append('promotion_fees_percentage', payload.promotion_fees_percentage)
  payload.photos.forEach((photo) => formData.append('photos[]', photo))
  payload.images.forEach((file) => formData.append('images[]', file))
  formData.append('_method', 'PUT')
  console.log('FormData entries for update:', productId, Array.from(formData.entries())) // Log FormData entries for debugging
  const response = await authFetch(`${API_BASE}/products/${productId}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  })
  const data = (await response.json().catch(() => ({}))) as {
    status?: boolean
    message?: string
    approbation?: boolean
    product?: unknown
  }
  syncAttributesFromPayload(data)
  if (!response.ok) {
    throw new Error(data.message ?? `Failed to update product (${response.status})`)
  }
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
    body: JSON.stringify({ products_id: productId, force_hide: forceHide }),
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
  console.log("response", response)
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
  syncUserFromPayload(data)
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
  syncUserFromPayload(data)
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
  syncUserFromPayload(data)
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

export async function fetchOrderMessages(
  token: string | undefined,
  params: { user_id: number; corresponding_id: number; line_order_id: number },
): Promise<MessagesFetchResponse> {
  const search = new URLSearchParams()
  search.set('user_id', String(params.user_id))
  search.set('corresponding_id', String(params.corresponding_id))
  search.set('line_order_id', String(params.line_order_id))
  const response = await authFetch(`${API_BASE}/msg-order/messages?${search.toString()}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load messages (${response.status})`)
  }
  return (await response.json()) as MessagesFetchResponse
}

export async function fetchOrderNewMessages(
  token: string | undefined,
  params: { user_id: number; line_order_id: number; end_message_id?: number },
): Promise<NewMessagesFetchResponse> {
  const search = new URLSearchParams()
  search.set('user_id', String(params.user_id))
  search.set('line_order_id', String(params.line_order_id))
  if (params.end_message_id) search.set('end_message_id', String(params.end_message_id))
  const response = await authFetch(`${API_BASE}/msg-order/new-messages?${search.toString()}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load new messages (${response.status})`)
  }
  console.log('New messages response:', await response.clone().text()) // Log the raw response for debugging
  return (await response.json()) as NewMessagesFetchResponse
}

export async function fetchOrderOldMessages(
  token: string | undefined,
  params: { user_id: number; line_order_id: number; start_message_id?: number },
): Promise<OldMessagesFetchResponse> {
  const search = new URLSearchParams()
  search.set('user_id', String(params.user_id))
  search.set('line_order_id', String(params.line_order_id))
  if (params.start_message_id) search.set('start_message_id', String(params.start_message_id))
  const response = await authFetch(`${API_BASE}/msg-order/old-messages?${search.toString()}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load old messages (${response.status})`)
  }
  return (await response.json()) as OldMessagesFetchResponse
}

export async function sendOrderMessage(
  token: string | undefined,
  params: {
    sender_id: number
    receiver_id: number
    message?: string
    line_order_id: number
    end_message_id?: number
    file?: File | null
  },
): Promise<SendMessageResponse> {
  const formData = new FormData()
  formData.append('sender_id', String(params.sender_id))
  formData.append('receiver_id', String(params.receiver_id))
  if (params.message) formData.append('message', params.message)
  formData.append('line_order_id', String(params.line_order_id))
  formData.append('end_message_id', String(params.end_message_id))
  if (params.file) formData.append('file', params.file)
  const response = await authFetch(`${API_BASE}/msg-order/send-message`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`Failed to send message (${response.status})`)
  }
  return (await response.json()) as SendMessageResponse
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

export async function fetchPartnersPayment(
  token: string | undefined,
): Promise<PartnersPaymentResponse> {
  const response = await authFetch(`${API_BASE}/partner/get-partners-payments-amount`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load partners payment (${response.status})`)
  }
  return (await response.json()) as PartnersPaymentResponse
}

export async function proceedPartnersPayment(
  token: string | undefined,
): Promise<PartnersPaymentResponse> {
  const response = await authFetch(`${API_BASE}/partner/get-partners-payments-amount`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to proceed partners payment (${response.status})`)
  }
  return (await response.json()) as PartnersPaymentResponse
}

export async function fetchPartnerWalletAddress(
  token: string | undefined,
): Promise<PartnerWalletAddressResponse> {
  const response = await authFetch(`${API_BASE}/partner/set-partner-wallet-address`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load partner wallet address (${response.status})`)
  }
  return (await response.json()) as PartnerWalletAddressResponse
}

export async function savePartnerWalletAddress(
  token: string | undefined,
  walletAddress: string,
): Promise<PartnerWalletAddressResponse> {
  const response = await authFetch(`${API_BASE}/partner/set-partner-wallet-address`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_address: walletAddress }),
  })
  if (!response.ok) {
    throw new Error(`Failed to save partner wallet address (${response.status})`)
  }
  return (await response.json()) as PartnerWalletAddressResponse
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
  const data = (await response.json().catch(() => ({})))
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

export async function fetchCartBuyNowData(
  token: string | undefined,
  productId: number,
): Promise<CartBuyNowResponse> {
  const response = await fetch(`${API_BASE}/products/${productId}`, {
    headers: authHeaders(token),
  })
  const data = (await response.json().catch(() => ({}))) as CartBuyNowResponse
  if (!response.ok) {
    throw new Error(data.message ?? `Failed to load product (${response.status})`)
  }
  syncSettingsFromPayload(data)
  syncAttributesFromPayload(data)
  syncUserFromPayload(data)
  return data
}

export async function confirmCart(
  token: string | undefined,
  payload: ConfirmCartPayload,
): Promise<ConfirmCartResponse> {
  const response = await fetch(`${API_BASE}/confirm-cart`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => ({}))) as ConfirmCartResponse
  if (!response.ok) {
    throw new Error(data.message ?? `Failed to confirm cart (${response.status})`)
  }
  syncUserFromPayload(data)
  return data
}

export async function payPiketplaceWallet(
  token: string | undefined,
  uid: string | undefined,
  payload: PiketplaceWalletPaymentPayload,
): Promise<PiketplaceWalletPaymentResponse> {
  const response = await fetch(`${API_BASE}/payment-piketplace-wallet`, {
    method: 'POST',
    headers: { ...authHeaders(token, uid), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => ({}))) as PiketplaceWalletPaymentResponse
  if (!response.ok) {
    throw new Error(data.message ?? `Failed to pay with Piketplace wallet (${response.status})`)
  }
  syncUserFromPayload(data)
  return data
}

export async function searchDeliveryCompanies(
  payload: SearchDeliveryCompaniesPayload,
): Promise<SearchDeliveryCompaniesResponse> {
  const response = await fetch(`${API_BASE}/search-for-delivery-companies`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => ({}))) as SearchDeliveryCompaniesResponse
  if (!response.ok) {
    throw new Error(`Failed to search delivery companies (${response.status})`)
  }
  return data
}

export async function fetchReferredUsers(
  token: string | undefined,
  keyword: string,
  page: number,
): Promise<ReferredUsersResponse> {
  const params = new URLSearchParams({ keyword, page: String(page) })
  const response = await fetch(`${API_BASE}/referred-users?${params.toString()}`, {
    headers: authHeaders(token),
  })
  const data = (await response.json().catch(() => ({}))) as ReferredUsersResponse
  if (!response.ok) {
    throw new Error(`Failed to load referred users (${response.status})`)
  }
  syncUserFromPayload(data)
  return data
}

export async function fetchNotifications(
  token: string | undefined,
  userId: number | undefined,
  page: number,
): Promise<NotificationsResponse> {
  const params = new URLSearchParams({ user_id: String(userId ?? ''), page: String(page) })
  const response = await fetch(`${API_BASE}/notifications?${params.toString()}`, {
    headers: authHeaders(token),
  })
  const data = (await response.json().catch(() => ({}))) as NotificationsResponse
  if (!response.ok) {
    throw new Error(`Failed to load notifications (${response.status})`)
  }
  syncUserFromPayload(data)
  return data
}

export async function fetchAdministration(
  token: string | undefined,
  uid: string,
): Promise<AdministrationResponse> {
  const response = await authFetch(`${API_BASE}/piketplace?uid=${encodeURIComponent(uid)}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load administration data (${response.status})`)
  }
  return (await response.json()) as AdministrationResponse
}

export async function saveSettings(
  token: string | undefined,
  userId: number,
  settings: AdminSettingItem[],
): Promise<AdministrationResponse> {
  const response = await authFetch(`${API_BASE}/save-settings`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, settings }),
  })
  const data = (await response.json().catch(() => ({}))) as AdministrationResponse
  if (!response.ok) {
    throw new Error(`Failed to save settings (${response.status})`)
  }
  syncUserFromPayload(data)
  return data
}

export async function fetchAdminUsers(
  token: string | undefined,
  keyword: string,
  page: number,
): Promise<AdminUsersResponse> {
  const params = new URLSearchParams({ keyword, page: String(page) })
  const response = await fetch(`${API_BASE}/users?${params.toString()}`, {
    headers: authHeaders(token),
  })
  const data = (await response.json().catch(() => ({}))) as AdminUsersResponse
  if (!response.ok) {
    throw new Error(`Failed to load users (${response.status})`)
  }
  syncUserFromPayload(data)
  return data
}

export interface AdminProductsQuery {
  page?: number
  search?: string
  connected_user_id?: number
  status?: string
}

export async function fetchAdminProducts(
  token: string | undefined,
  params: AdminProductsQuery,
): Promise<AdminProductsResponse> {
  const search = new URLSearchParams()
  search.set('request_from', 'admin')
  if (params.page) search.set('page', String(params.page))
  if (params.search) search.set('search', params.search)
  if (params.connected_user_id) search.set('connected_user_id', String(params.connected_user_id))
  if (params.status) search.set('status', params.status)
  const response = await authFetch(`${API_BASE}/product-reloading?${search.toString()}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load admin products (${response.status})`)
  }
  return (await response.json()) as AdminProductsResponse
}

export async function fetchAdminOrders(
  token: string | undefined,
  page = 1,
): Promise<AdminOrdersResponse> {
  const response = await authFetch(`${API_BASE}/admin-orders?page=${page}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load admin orders (${response.status})`)
  }
  return (await response.json()) as AdminOrdersResponse
}

export async function fetchAdminShippedOrders(
  token: string | undefined,
  page = 1,
): Promise<AdminOrdersResponse> {
  const response = await authFetch(`${API_BASE}/admin-shipped-line-orders?page=${page}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load admin shipped orders (${response.status})`)
  }
  return (await response.json()) as AdminOrdersResponse
}

export async function fetchPreOrders(
  token: string | undefined,
  page = 1,
): Promise<PreOrdersResponse> {
  const response = await authFetch(`${API_BASE}/pre-orders?page=${page}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load pre orders (${response.status})`)
  }
  return (await response.json()) as PreOrdersResponse
}

export interface AdminWithdrawalsQuery {
  page?: number
  search?: string
  status?: string
}

export async function fetchAdminWithdrawals(
  token: string | undefined,
  params: AdminWithdrawalsQuery,
): Promise<AdminWithdrawalsResponse> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.search) search.set('search', params.search)
  if (params.status) search.set('status', params.status)
  const response = await authFetch(`${API_BASE}/get-admin-withdrawals?${search.toString()}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load admin withdrawals (${response.status})`)
  }
  return (await response.json()) as AdminWithdrawalsResponse
}

export async function confirmWithdrawal(
  token: string | undefined,
  withdrawId: number,
): Promise<{ status?: boolean; message?: string }> {
  const response = await authFetch(`${API_BASE}/withdrawal-validation`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'confirmation', withdraw_id: withdrawId }),
  })
  const data = (await response.json().catch(() => ({}))) as { status?: boolean; message?: string }
  if (!response.ok) {
    throw new Error(data.message ?? `Failed to confirm withdrawal (${response.status})`)
  }
  return data
}

export async function cancelWithdrawalConfirmation(
  token: string | undefined,
  withdrawId: number,
): Promise<{ status?: boolean; message?: string }> {
  const response = await authFetch(`${API_BASE}/withdrawal-validation`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'confirmation_cancel', withdraw_id: withdrawId }),
  })
  const data = (await response.json().catch(() => ({}))) as { status?: boolean; message?: string }
  if (!response.ok) {
    throw new Error(data.message ?? `Failed to cancel withdrawal confirmation (${response.status})`)
  }
  return data
}

export async function rejectWithdrawal(
  token: string | undefined,
  withdrawId: number,
  reasons: string[],
): Promise<{ status?: boolean; message?: string }> {
  const response = await authFetch(`${API_BASE}/withdrawal-validation`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancellation', reasons, withdraw_id: withdrawId }),
  })
  const data = (await response.json().catch(() => ({}))) as { status?: boolean; message?: string }
  if (!response.ok) {
    throw new Error(data.message ?? `Failed to reject withdrawal (${response.status})`)
  }
  return data
}

export async function fetchWalletBalanceDetails(
  token: string | undefined,
  username: string,
): Promise<WalletBalanceDetailsData> {
  const response = await authFetch(`${API_BASE}/get-admin-wallet-details?username=${encodeURIComponent(username)}`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to load wallet details (${response.status})`)
  }
  return (await response.json()) as WalletBalanceDetailsData
}

export async function getSettingsUser(token: string | undefined): Promise<SettingsUserResponse> {
  const response = await fetch(`${API_BASE}/get-settings`, {
    headers: authHeaders(token),
  })
  const data = (await response.json().catch(() => ({}))) as SettingsUserResponse
  if (!response.ok) {
    throw new Error(`Failed to load settings (${response.status})`)
  }
  syncUserFromPayload(data)
  return data
}

export async function fetchLineOrder(
  token: string | undefined,
  id: number,
): Promise<LineOrderResponse> {
  const response = await fetch(`${API_BASE}/line-orders-api/${id}`, {
    headers: authHeaders(token),
  })
  const data = (await response.json().catch(() => ({}))) as LineOrderResponse
  if (!response.ok) {
    throw new Error(`Failed to load line order (${response.status})`)
  }
  return data
}

export async function updateLineOrderShippingStatus(
  token: string | undefined,
  lineOrderId: number,
  type: string,
): Promise<LineOrderResponse & { status?: boolean; message?: string }> {
  const response = await fetch(`${API_BASE}/line-orders-api/${lineOrderId}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })
  const data = (await response.json().catch(() => ({}))) as LineOrderResponse & {
    status?: boolean
    message?: string
  }
  if (!response.ok) {
    throw new Error(`Failed to update line order (${response.status})`)
  }
  return data
}

export async function saveShippingImages(
  token: string | undefined,
  payload: SaveShippingImagesPayload,
): Promise<SaveShippingImagesResponse> {
  const response = await fetch(`${API_BASE}/save-shipping-images`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => ({}))) as SaveShippingImagesResponse
  if (!response.ok) {
    throw new Error(`Failed to save shipping images (${response.status})`)
  }
  return data
}

export async function uploadFileToStore(
  token: string | undefined,
  file: File,
): Promise<FileStoreResponse> {
  const formData = new FormData()
  formData.append('selectedFiles', file, file.name)
  const response = await fetch(`${API_BASE}/file-store`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  })
  const data = (await response.json().catch(() => ({}))) as FileStoreResponse
  if (!response.ok) {
    throw new Error(`Failed to upload file (${response.status})`)
  }
  return data
}

export async function updateProfil(
  token: string | undefined,
  formData: FormData,
): Promise<ProfilResponse> {
  const response = await fetch(`${API_BASE}/profil`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  })
  const data = (await response.json().catch(() => ({}))) as ProfilResponse
  if (!response.ok) {
    throw new Error(`Failed to save profile (${response.status})`)
  }
  syncUserFromPayload(data)
  return data
}

export async function sendEmailValidation(
  token: string | undefined,
  email: string,
): Promise<ProfilResponse> {
  const response = await fetch(`${API_BASE}/send-email-validation`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = (await response.json().catch(() => ({}))) as ProfilResponse
  if (!response.ok) {
    throw new Error(`Failed to send email validation (${response.status})`)
  }
  syncUserFromPayload(data)
  return data
}

export async function setEmailValidation(
  token: string | undefined,
  email: string,
  code: string,
): Promise<ProfilResponse> {
  const response = await fetch(`${API_BASE}/set-email-validation`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  const data = (await response.json().catch(() => ({}))) as ProfilResponse
  if (!response.ok) {
    throw new Error(`Failed to validate email (${response.status})`)
  }
  syncUserFromPayload(data)
  return data
}

export async function fetchDeliveryPenalitiesData(
  token: string | undefined,
): Promise<DeliveryPenalitiesDataResponse> {
  const response = await fetch(`${API_BASE}/get-delivery-penalities-data`, {
    headers: authHeaders(token),
  })
  const data = (await response.json().catch(() => ({}))) as DeliveryPenalitiesDataResponse
  if (!response.ok) {
    throw new Error(`Failed to load penalties data (${response.status})`)
  }
  return data
}

export async function payDeliveryPenaltiesPiketplaceWallet(
  token: string | undefined,
  codePin: string,
): Promise<DeliveryPenalitiesDataResponse> {
  const response = await fetch(`${API_BASE}/get-delivery-penalities-data`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ code_pin: codePin }),
  })
  const data = (await response.json().catch(() => ({}))) as DeliveryPenalitiesDataResponse
  if (!response.ok) {
    throw new Error(data.message ?? `Failed to pay penalties (${response.status})`)
  }
  syncUserFromPayload(data)
  return data
}

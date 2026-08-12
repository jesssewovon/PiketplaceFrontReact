export interface ProductImage {
  dossier: string
  name: string
  lien: string
}

export interface ProductUser {
  id: number
  username: string
  firstname?: string
  lastname?: string
  avatar?: string
  shop_name?: string
  fullname?: string
  fullnameOrUsername?: string
  shopNameShow?: string
  shortname?: string
}

export interface Product {
  id: number
  pi_users_id: number
  libelle: string
  description: string
  price: number
  price_str?: string
  quantity: number
  address?: string
  is_digital: boolean
  status?: string
  free_shipping: boolean
  images: ProductImage[]
  country_code?: string
  created_at: string
  currency?: string
  imageFirst?: string
  isNew?: boolean
  isBoosted?: boolean
  comments_count?: number
  user?: ProductUser
}

export interface PaginatedProducts {
  current_page: number
  data: Product[]
  first_page_url?: string
  from?: number
  last_page?: number
  next_page_url?: string | null
  path?: string
  per_page?: number
  prev_page_url?: string | null
  to?: number
  total?: number
}

export interface PaginatedResponse {
  products: PaginatedProducts
  settings_user?: unknown
}

export interface ProductValidation {
  status?: string
  reasons?: string[] | null
  comment?: string
}

export interface MyProduct extends Product {
  visible?: boolean
  last_validation?: ProductValidation | null
}

export interface StoreCategory {
  id: number
  code: string
  img?: string
  products: Product[]
}

export interface StoreData {
  categories: StoreCategory[]
  products: Product[]
}

export interface CancellationReason {
  code: string
  text: string
  penalty_point?: number
  selected?: boolean
}

export interface PurchaseData {
  shipping_fee?: number
  handling_fee?: number
  total?: number
  [key: string]: unknown
}

export interface ShippingInfo {
  final_free_shipping?: boolean
  final_paid_shipping?: boolean
  fee?: number
}

export interface ShippingAddress {
  name?: string
  country_name?: string
  city?: string
  address?: string
  phone_number?: string
  email?: string
}

export interface LineOrderUser {
  id: number
  username?: string
  avatar?: string
  shortname?: string
  fullnameOrUsername?: string
  shortShopname?: string
}

export interface LineOrderProduct {
  id: number
  libelle: string
  price?: number
  price_str?: string
  currency?: string
  imageFirst?: string
  is_digital?: boolean
  user?: LineOrderUser
}

export interface LineOrder {
  id: number
  reference?: string
  shipped?: boolean
  shipped_at?: string | null
  cancelled_at?: string | null
  cancellableDirectly?: boolean
  line_order_cancellation?: unknown | null
  statusPercentDisplay?: number
  shippingAddress?: string
  messages_count?: number
  noshipping?: boolean
  quantity?: number
  price?: number
  price_converted?: number
  currency_conversion?: string
  purchaseData?: PurchaseData
  shipping_info?: ShippingInfo | null
  product?: LineOrderProduct
  order?: {
    user?: LineOrderUser
    ordered_at?: string
    shipping?: ShippingAddress
  }
  total?: number
  fee?: number
  [key: string]: unknown
}

export interface PaginatedLineOrders {
  current_page: number
  data: LineOrder[]
  last_page?: number
  next_page_url?: string | null
  total?: number
}

export interface SalesResponse {
  sales_line_orders: PaginatedLineOrders
  seller_order_cancellation_reasons?: CancellationReason[]
}

export interface OrdersResponse {
  line_orders: PaginatedLineOrders
  buyer_order_cancellation_reasons?: CancellationReason[]
}

export interface PaginatedMyProducts {
  current_page: number
  data: MyProduct[]
  last_page?: number
  next_page_url?: string | null
  total?: number
}

export interface MyProductsResponse {
  products: PaginatedMyProducts
  approbation_active?: boolean
}

export type NewProductPayload = {
  category_selected_id: string
  libelle: string
  description: string
  price: string
  quantity: string
  address: string
  country_code: string
  city: string
  email: string
  is_digital: boolean
  shipping_zone: string
  free_shipping: boolean
  free_shipping_zone: string
  promotion_fees_activated: boolean
  promotion_fees_percentage: string
  product_available: boolean
  saling_terms_agreements: boolean
  images: File[]
}

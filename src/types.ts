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
  visible?: boolean
  last_validation?: ProductValidation | null
  comments?: ProductComment[]
  shipping_zone?: ProductShippingZone[]
  free_shipping_zone?: ProductShippingZone[]
  promotion_fees_activated?: boolean
  promotion_fees_percentage?: number
  last_boost?: ProductBoost | null
  phone_code?: string
  phone_number?: string
  quantity_selling?: number
  city?: string
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
  country_code?: string
  country_name?: string
  city?: string
  address?: string
  phone_code?: string
  phone_number?: string
  email?: string
  is_default?: boolean
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
  statusPercent?: number
  statusColor?: string
  hasDeliver?: boolean
  deliver_pi_users_id?: number
  seller_to_deliver_at?: string | boolean | null
  deliver_from_seller_at?: string | boolean | null
  deliver_to_buyer_at?: string | boolean | null
  buyer_from_deliver_at?: string | boolean | null
  seller_to_buyer_at?: string | boolean | null
  buyer_from_seller_at?: string | boolean | null
  shipping_images?: Record<string, ShippingImageLine[]> | null
  hasAtLeastOneSellerToDeliverImage?: boolean
  hasAtLeastOneDeliverFromSellerImage?: boolean
  hasAtLeastOneDeliverToBuyerImage?: boolean
  hasAtLeastOneBuyerFromDeliverImage?: boolean
  hasAtLeastOneSellerToBuyerImage?: boolean
  hasAtLeastOneBuyerFromSellerImage?: boolean
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
    pi_users_id?: number
    paid?: boolean
    user?: LineOrderUser
    ordered_at?: string
    shipping?: ShippingAddress
  }
  total?: number
  fee?: number
  [key: string]: unknown
}

export interface ShippingImageLine {
  id?: number
  lien: string
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
  seller_order_cancellation_reasons?: CancellationReason[] | Record<string, CancellationReason[]>
}

export interface OrdersResponse {
  line_orders: PaginatedLineOrders
  buyer_order_cancellation_reasons?: CancellationReason[] | Record<string, CancellationReason[]>
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

export interface MessageContact {
  id: number
  reference?: string
  product?: {
    pi_users_id?: number
    [key: string]: unknown
  } | null
  created_at?: string
  last_message?: {
    created_at?: string
    isImage?: boolean
    imageName?: string
    message?: string
  } | null
  messages_count?: number
}

export interface PaginatedMessageContacts {
  current_page: number
  data: MessageContact[]
  last_page?: number
  next_page_url?: string | null
  total?: number
}

export interface MessageContactsResponse {
  contacts: PaginatedMessageContacts
}

export interface Partnership {
  id?: number
  name?: string
  description?: string
  logo_link?: string | null
  code?: string
}

export interface PartnershipsResponse {
  partnerships?: Partnership[]
}

export interface AdsBalanceItem {
  id?: number
  period?: string
  month?: string
  amount?: number | null
  number_ads_views?: number
  paid?: boolean
}

export interface AdsData {
  current_balance?: {
    month?: string
    period?: string
    number_ads_views?: number
  } | null
  remaining_time?: number
  limit_reached?: boolean
  ads_history_data?: {
    current_balance?: AdsData['current_balance']
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

export interface AdsDataResponse {
  status?: boolean
  ads_data?: AdsData
  cost_per_pi?: number
  activate_pi_rewarded_ads?: boolean
  [key: string]: unknown
}

export interface AdsHistoriesResponse {
  balances?: { data?: AdsBalanceItem[]; [key: string]: unknown }
}

export interface RewardAdsResponse {
  status?: boolean
  message?: string
  ads_data?: AdsData
  activate_pi_rewarded_ads?: boolean
  data?: unknown
}

export interface PartnerAccountInfo {
  id?: number
  country_code?: string
  balance?: number
  wallet_address?: string | null
  [key: string]: unknown
}

export interface PartnerAccountResponse {
  partnerAccount?: PartnerAccountInfo | null
  today_amount?: number
  yesterday_amount?: number
  this_month_amount?: number
  last_month_amount?: number
  nb_orders?: number
  [key: string]: unknown
}

export interface PartnerOrdersResponse {
  orders?: PaginatedLineOrders
}

export interface DonationResponse {
  status?: boolean
  message?: string
  payment?: unknown
}

export interface PaymentVerifierResponse {
  payment?: unknown | null
  [key: string]: unknown
}

export interface AddressesResponse {
  addresses?: ShippingAddress[]
  status?: boolean
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

export interface ProductComment {
  id?: number
  comment?: string
  created_at?: string
  user?: {
    username?: string
    avatar?: string
  }
  [key: string]: unknown
}

export interface ProductShippingZone {
  country_name?: string
  city?: string
  zone?: string
  fee_amount?: number
  fee?: number
  fee_pi?: number
  [key: string]: unknown
}

export interface ProductBoost {
  id?: number
  amount?: number
  currencies_code?: string
  period?: string
  boost_ends_at?: string
  [key: string]: unknown
}

export interface BoostPeriod {
  id?: string
  [key: string]: unknown
}

export interface BoostPosition {
  global_position?: number
  country_position?: number
  [key: string]: unknown
}

export interface ProductDetailResponse {
  status?: boolean
  message?: string
  product?: Product
  boost_periods?: BoostPeriod[]
  approbation_active?: boolean
  deletion_active?: boolean
  update_active?: boolean
  boostPositionCheck?: BoostPosition
  boostPosition?: BoostPosition
  reasons?: CancellationReason[]
  [key: string]: unknown
}

export interface BoostResponse {
  status?: boolean
  message?: string
  product?: Product
  boostPositionCheck?: BoostPosition
  boostPosition?: BoostPosition
  amount_min_required?: number | string
  currencies_code?: string
  [key: string]: unknown
}

export interface AddToCartPayload {
  products_id: number
  username?: string
  quantity: number
  in_free_shipping_zone: string
  in_paid_shipping_zone: string
}

export interface CartBuyNowResponse {
  status?: boolean
  message?: string
  product?: Product
  addresses?: ShippingAddress[]
  handling_fee_percentage?: number
  [key: string]: unknown
}

export interface BuyNowCartItem {
  id: number
  quantity: number
  noshipping: boolean
  final_free_shipping: boolean
  final_paid_shipping: boolean
  paid_shipping_info: BuyNowPaidShippingInfo | Record<string, never>
  pre_order: boolean
  purchase_referrer?: number
}

export interface BuyNowPaidShippingInfo {
  selected?: ProductShippingZone
  zone_list?: string
  fee?: number
  [key: string]: unknown
}

export interface ConfirmCartPayload {
  user_id?: number
  cart: BuyNowCartItem[]
  address: ShippingAddress
  price_usd_accepted: boolean | null
  save_cart: boolean
}

export interface ConfirmCartResponse {
  status?: boolean
  message?: string
  data_cart?: {
    total?: number
    cart?: BuyNowCartItem[]
    price_usd_accepted?: boolean
    pi_usdt_value?: number
    handling_fee_percentage?: number
    [key: string]: unknown
  }
  data?: {
    product?: Product
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface PiketplaceWalletPaymentPayload {
  code_pin: string
  isNewAddress: string | boolean
  total: number
  address: ShippingAddress
  product: {
    id: number
    quantity: number
    noshipping: boolean
    direct_free_shipping: boolean
    direct_paid_shipping: boolean
  }
  cart: BuyNowCartItem[]
  isBuyNow: true
  handling_fee_percentage: number
}

export interface PiketplaceWalletPaymentResponse {
  status?: boolean
  message?: string
  data?: {
    product?: Product
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

export interface DeliveryCompanyZoneLine {
  city?: string
  zone?: string
  [key: string]: unknown
}

export interface DeliveryCompany {
  name?: string
  pickup_zones?: DeliveryCompanyZoneLine[]
  drop_zones?: DeliveryCompanyZoneLine[]
  [key: string]: unknown
}

export interface SearchDeliveryCompaniesPayload {
  departure_country_code?: string
  departure_city?: string
  departure_address?: string
  arrival_country_code?: string
  arrival_city?: string
  arrival_address?: string
}

export interface SearchDeliveryCompaniesResponse {
  deliverCompanies?: DeliveryCompany[]
  [key: string]: unknown
}

export interface ReferredUser {
  id: number
  username?: string
  avatar?: string
  locale?: string
  user_country?: { iso2?: string } | null
}

export interface PaginatedReferredUsers {
  current_page: number
  data: ReferredUser[]
  last_page?: number
  total?: number
}

export interface ReferredUsersResponse {
  referred_users?: PaginatedReferredUsers
  [key: string]: unknown
}

export interface SettingsUserResponse {
  settings_user?: Record<string, unknown>
  [key: string]: unknown
}

export interface LineOrderResponse {
  line_order?: LineOrder
  [key: string]: unknown
}

export interface SaveShippingImagesPayload {
  user_id?: number
  line_order_id: number
  images: string[]
  type: string
}

export interface SaveShippingImagesResponse {
  status?: boolean
  message?: string
  line_order?: LineOrder
  [key: string]: unknown
}

export interface FileStoreResponse {
  name?: string
  [key: string]: unknown
}

export interface ProfilResponse {
  status?: boolean
  message?:
    | {
        email?: string[] | string
        [key: string]: unknown
      }
    | string
  [key: string]: unknown
}

export interface PenaltiesData {
  delivery_penalties_limit?: number
  penalties_amount_pi?: number
  penalties_amount_piket?: number
  delivery_penalties_payment_with_time_activate?: boolean
  memo?: string
  uniqueId?: string
  userId?: number
  [key: string]: unknown
}

export interface DeliveryPenalitiesDataResponse {
  status?: boolean
  message?: string
  is_still_penalized?: boolean
  penalities_data?: PenaltiesData
  text?: string
  remaining_time?: number
  [key: string]: unknown
}

export interface AppNotification {
  id?: number
  is_new?: number
  message: string
  datas?: Record<string, unknown> | null
  url?: { name?: string; params?: Record<string, unknown>; [key: string]: unknown } | null
  created_at?: string
  type?: number
}

export interface PaginatedNotifications {
  current_page: number
  data: AppNotification[]
  last_page?: number
  total?: number
}

export interface NotificationsResponse {
  notifications?: PaginatedNotifications
  [key: string]: unknown
}

export interface AdministrationData {
  total_token_amount?: number
  nb_rewarded_ads?: number
  nb_settings?: number
  nb_daily_active_users?: number
  nb_users?: number
  nb_products_pending?: number
  nb_products?: number
  nb_orders_shipped?: number
  nb_orders?: number
  nb_failed_payments?: number
  nb_contacts?: number
  nb_withdrawal?: number
  [key: string]: unknown
}

export interface AdminSettingItem {
  name?: string
  value?: unknown
  [key: string]: unknown
}

export interface AdministrationResponse {
  data?: AdministrationData
  settings?: AdminSettingItem[]
  [key: string]: unknown
}

export interface WithdrawalRequest {
  id: number
  real_amount?: number
  public_key?: string
  created_at?: string
  confirmed_at?: string | null
  wallet?: {
    user?: {
      username?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface AdminWithdrawalsResponse {
  withdrawal_requests?: PaginatedWithdrawals
  withdrawal_reasons?: CancellationReason[] | Record<string, CancellationReason[]>
  [key: string]: unknown
}

export interface PaginatedWithdrawals {
  current_page: number
  data: WithdrawalRequest[]
  last_page?: number
  next_page_url?: string | null
  total?: number
}

export interface WalletBalanceDetailsData {
  pending_withdraw?: number
  pending_withdraw_fee?: number
  user_wallet?: {
    balance?: number
    [key: string]: unknown
  }
  pi_wallet?: {
    realBalance?: number
    [key: string]: unknown
  }
  total_credit?: number
  total_debit?: number
  equilibre?: number
  transactions?: WalletTransaction[]
  [key: string]: unknown
}

export interface WalletTransaction {
  type_transaction?: string
  real_amount?: number
  created_at?: string
  details?: Record<string, unknown>
  wallet?: {
    user?: {
      username?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface AdminProductsResponse {
  products?: PaginatedMyProducts
  approbation_active?: boolean
  reasons?: CancellationReason[] | Record<string, CancellationReason[]>
  [key: string]: unknown
}

export interface AdminOrdersResponse {
  line_orders?: PaginatedLineOrders
  [key: string]: unknown
}

export interface PreOrderItem {
  id: number
  quantity?: number
  total?: number
  fee?: number
  totalFee?: number
  canPayOnPreorder?: boolean
  created_at?: string
  pre_order_address?: ShippingAddress
  applications_count?: number
  product?: {
    id?: number
    libelle?: string
    price_str?: string
    imageFirst?: string
    user?: LineOrderUser
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface PreOrdersResponse {
  pre_orders?: {
    current_page: number
    data: PreOrderItem[]
    last_page?: number
    next_page_url?: string | null
    total?: number
  }
  [key: string]: unknown
}

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

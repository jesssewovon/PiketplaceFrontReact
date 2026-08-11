import type { Product } from '../types'

export interface ProductsCache {
  products: Product[]
  page: number
  hasMore: boolean
  loaded: boolean
  error: string | null
  scrollY: number
}

export const productsCache: ProductsCache = {
  products: [],
  page: 1,
  hasMore: true,
  loaded: false,
  error: null,
  scrollY: 0,
}

try {
  window.history.scrollRestoration = 'manual'
} catch {
  // ignore unsupported browsers
}

export function saveProductsScroll(scrollY: number) {
  productsCache.scrollY = scrollY
}

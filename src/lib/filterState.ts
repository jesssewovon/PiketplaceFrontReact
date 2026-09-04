export type ProductTypeFilter = 'all' | 'show_products_shipping_on' | 'show_only_digital_products'
export type SortBy = 'newest' | 'oldest' | 'random'

export interface FilterState {
  search: string
  iso2: string
  iso3: string
  productType: ProductTypeFilter
  sortBy: SortBy
  category: number | null
  isUpdated: boolean
}

export const defaultFilter: FilterState = {
  search: '',
  iso2: 'all',
  iso3: 'all',
  productType: 'all',
  sortBy: 'newest',
  category: null,
  isUpdated: true,
}

const FILTER_STORAGE_KEY = 'piketplace_filter'

export function getStoredFilter(): FilterState | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<FilterState>
    return { ...defaultFilter, ...parsed }
  } catch {
    return null
  }
}

export function storeFilter(filter: FilterState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filter))
  } catch {
    return
  }
}
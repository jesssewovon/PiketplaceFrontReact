import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PackageX, Loader2, SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Product } from '../types'
import { fetchProducts } from '../lib/api'
import { productsCache, saveProductsScroll } from '../lib/productsStore'
import { useAppDispatch } from '../store/hooks'
import { setProductsLoaded } from '../store/uiSlice'
import ProductCard from '../components/ProductCard'

const SKELETON_HEIGHTS = [200, 280, 240, 320, 180, 300, 220, 260]

function CardSkeleton({ height }: { height: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-soft">
      <div className="lazy-shimmer w-full" style={{ height }} />
      <div className="space-y-2 p-3">
        <div className="lazy-shimmer h-3.5 w-3/4 rounded" />
        <div className="lazy-shimmer h-3 w-full rounded" />
        <div className="lazy-shimmer h-3 w-1/2 rounded" />
      </div>
    </div>
  )
}

function matchesQuery(product: Product, query: string): boolean {
  const haystack = [
    product.libelle,
    product.description,
    product.user?.username,
    product.user?.fullname,
    product.user?.shopNameShow,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

export default function IndexPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>(productsCache.products)
  const [page, setPage] = useState(productsCache.page)
  const [hasMore, setHasMore] = useState(productsCache.hasMore)
  const [loading, setLoading] = useState(!productsCache.loaded)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(productsCache.error)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)

  const query = useMemo(
    () => (searchParams.get('q') ?? '').trim().toLowerCase(),
    [searchParams],
  )

  const filtered = useMemo(
    () => (query ? products.filter((p) => matchesQuery(p, query)) : products),
    [products, query],
  )

  const loadPage = useCallback(async (targetPage: number) => {
    if (lockRef.current) return
    lockRef.current = true
    setLoadingMore(true)
    try {
      const data = await fetchProducts(targetPage)
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        const fresh = data.products.data.filter((p) => !seen.has(p.id))
        const next = [...prev, ...fresh]
        productsCache.products = next
        return next
      })
      setPage(targetPage)
      productsCache.page = targetPage
      setHasMore(
        data.products.next_page_url != null &&
          (data.products.last_page == null || targetPage < data.products.last_page),
      )
      productsCache.hasMore =
        data.products.next_page_url != null &&
        (data.products.last_page == null || targetPage < data.products.last_page)
      setError(null)
      productsCache.error = null
      productsCache.loaded = true
      dispatch(setProductsLoaded(true))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('index_load_failed', { defaultValue: "Couldn't load products" })
      setError(message)
      productsCache.error = message
    } finally {
      setLoadingMore(false)
      lockRef.current = false
    }
  }, [dispatch, t])

  useEffect(() => {
    if (productsCache.loaded) {
      dispatch(setProductsLoaded(true))
      return
    }
    setLoading(true)
    loadPage(1).finally(() => setLoading(false))
  }, [dispatch, loadPage])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading && !loadingMore) {
          void loadPage(page + 1)
        }
      },
      { rootMargin: '400px 0px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [page, hasMore, loading, loadingMore, loadPage])

  useLayoutEffect(() => {
    if (!productsCache.loaded) return
    let raf = 0
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        window.scrollTo(0, productsCache.scrollY)
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onScroll = () => saveProductsScroll(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      saveProductsScroll(window.scrollY)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const isEmpty = !loading && !error && products.length === 0
  const noResults = query && !loading && filtered.length === 0

  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-primary-deep px-4 pb-9 pt-7 text-white">
        <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/10" />
        <p className="text-xs font-medium uppercase tracking-widest text-white/70">
          {t('index_hero_badge', { defaultValue: 'Pi Network Marketplace' })}
        </p>
        <h1 className="text-shadow-hero mt-1 text-2xl font-extrabold leading-tight">
          {t('index_hero_title', { defaultValue: 'Discover, buy & sell with Pi' })}
        </h1>
        <p className="mt-2 max-w-[300px] text-sm text-white/85">
          {t('index_hero_subtitle', {
            defaultValue: 'Thousands of products and services priced in Pi cryptocurrency.',
          })}
        </p>
      </section>

      <section className="px-3 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary-dark">
            {query ? (
              <>
                {t('index_results_for', {
                  count: filtered.length,
                  defaultValue: '{count} results for',
                })}{' '}
                <span className="text-primary">“{query}”</span>
              </>
            ) : (
              t('index_latest_products', { defaultValue: 'Latest products' })
            )}
          </h2>
          {!loading && !error && !query && (
            <span className="text-[11px] font-medium text-ink-soft">
              {t('index_items', {
                count: products.length,
                defaultValue: '{count} items',
              })}
            </span>
          )}
        </div>

        {loading ? (
          <div className="columns-2 gap-3 [column-fill:_balance]">
            {SKELETON_HEIGHTS.map((height, i) => (
              <div key={i} className="mb-3 break-inside-avoid">
                <CardSkeleton height={height} />
              </div>
            ))}
          </div>
        ) : error && products.length === 0 ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-600">{t('index_load_failed', { defaultValue: "Couldn't load products" })}</p>
            <p className="mt-1 text-xs text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => {
                setProducts([])
                productsCache.products = []
                setPage(1)
                setHasMore(true)
                setLoading(true)
                productsCache.loaded = false
                void loadPage(1).finally(() => setLoading(false))
              }}
              className="mt-4 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
            >
              {t('index_try_again', { defaultValue: 'Try again' })}
            </button>
          </div>
        ) : noResults ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <SearchX size={40} className="text-slate-300" />
            <p className="text-sm font-medium text-ink">
              {t('index_no_matches', { query, defaultValue: 'No matches for “{query}”' })}
            </p>
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="mt-1 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
            >
              {t('index_clear_search', { defaultValue: 'Clear search' })}
            </button>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-2 py-16 text-ink-soft">
            <PackageX size={40} className="text-slate-300" />
            <p className="text-sm font-medium">{t('index_no_products', { defaultValue: 'No products yet' })}</p>
          </div>
        ) : (
          <>
            <div className="columns-2 gap-3 [column-fill:_balance]">
              {filtered.map((product) => (
                <div key={product.id} className="mb-3 break-inside-avoid">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {error && products.length > 0 && (
              <p className="mt-4 text-center text-xs text-red-500">{error}</p>
            )}
          </>
        )}
      </section>

      {!query && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loadingMore ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Loader2 size={16} className="animate-spin" />
              {t('index_loading_more', { defaultValue: 'Loading more…' })}
            </div>
          ) : hasMore && !loading && products.length > 0 ? (
            <span className="text-[11px] text-slate-400">
              {t('index_scroll_for_more', { defaultValue: 'Scroll for more' })}
            </span>
          ) : !loading && products.length > 0 ? (
            <span className="text-[11px] font-medium text-ink-soft">
              {t('index_reached_end', { defaultValue: "You've reached the end" })}
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}

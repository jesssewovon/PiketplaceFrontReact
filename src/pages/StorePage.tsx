import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Product, UserShop } from '../types'
import { getUserShop, fetchShopProducts } from '../lib/api'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'
import ProductCard from '../components/ProductCard'

export default function StorePage() {
  const { t } = useTranslation()
  const { shopUserId } = useParams<{ shopUserId: string }>()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)

  const [userShop, setUserShop] = useState<UserShop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [noMoreData, setNoMoreData] = useState(false)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingRef = useRef(false)
  const shopUserIdNum = Number(shopUserId) || 0
  const isOwner = isLoggedIn && user?.id === shopUserIdNum

  const loadShop = useCallback(async () => {
    try {
      const data = await getUserShop(shopUserIdNum, token ?? undefined)
      setUserShop(data.userShop)
    } catch {
      setUserShop(null)
    }
  }, [shopUserIdNum, token])

  const loadProducts = useCallback(
    async (page: number, append: boolean) => {
      if (loadingRef.current) return
      loadingRef.current = true
      if (append) setIsLoadingMore(true)
      else setIsLoading(true)
      try {
        const res = await fetchShopProducts(page, shopUserIdNum)
        console.log('Fetched shop products:', res)
        const list = res.products.data ?? []
        console.log('Fetched shop products list:', list)
        setProducts((prev) => (append ? [...prev, ...list] : list))
        setLastPage(res.products.last_page ?? 1)
        setCurrentPage(page)
        if (list.length === 0 || page >= (res.products.last_page ?? 1)) {
          setNoMoreData(true)
        }
      } catch {
        if (!append) setProducts([])
      } finally {
        loadingRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [shopUserIdNum],
  )

  useEffect(() => {
    if (!shopUserIdNum) return
    setIsLoading(true)
    setProducts([])
    setCurrentPage(1)
    setLastPage(0)
    setNoMoreData(false)
    void loadShop()
    void loadProducts(1, false)
  }, [shopUserIdNum, loadShop, loadProducts])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingRef.current && !noMoreData && currentPage < lastPage) {
          void loadProducts(currentPage + 1, true)
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadProducts, currentPage, lastPage, noMoreData])

  const shopName = isOwner
    ? t('side_menu.my_store', { defaultValue: 'My Store' })
    : userShop?.shop_name || userShop?.username || ''

  if (!isLoggedIn) return <LoginPanel />

  if (isLoading && !userShop) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="text-xs font-medium text-ink-soft">
          {t('loading', { defaultValue: 'Loading...' })}
        </span>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <section className="px-1 py-6">
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
          <div
            className="h-24 w-full bg-cover bg-center"
            style={{ backgroundImage: "url('/site_images/shop_back.jpg')" }}
          />
          <div className="px-4 pb-3">
            <img
              src={userShop?.avatar && userShop.avatar !== 'pi.png' ? userShop.avatar : '/site_images/pi.png'}
              alt={shopName}
              className="-mt-7 h-[70px] w-[70px] rounded-full border-4 border-white object-cover shadow-soft"
            />
            <h1 className="mt-2 text-lg font-bold text-ink">{shopName}</h1>
          </div>

          <div className="border-t border-black/5 px-2 pb-4">
            <div className="mt-4">
              {isLoading && products.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-xs text-ink-soft">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  {t('loading', { defaultValue: 'loading' })}
                </div>
              ) : products.length > 0 ? (
                <div className="columns-2 gap-1.5 [column-fill:_balance]">
                  {products.map((product) => (
                    <div key={product.id} className="mb-3 break-inside-avoid">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              ) : (
                !isLoading && (
                  <p className="py-8 text-center text-xs font-medium text-ink-soft">
                    {t('no_data', { defaultValue: 'No data' })}
                  </p>
                )
              )}

              <div ref={sentinelRef} className="flex justify-center py-6">
                {isLoadingMore && <Loader2 size={20} className="animate-spin text-primary" />}
                {noMoreData && products.length > 0 && (
                  <span className="text-[10px] font-medium text-ink-soft">
                    {t('no_more_data', { defaultValue: 'No more data' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

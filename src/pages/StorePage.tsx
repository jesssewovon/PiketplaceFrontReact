import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Product, StoreCategory, UserShop } from '../types'
import { getUserShop, fetchShopProducts } from '../lib/api'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'
import LazyImage from '../components/LazyImage'

interface StoreTab {
  key: 'home' | 'products'
  labelKey: string
  labelFallback: string
}

function ProductThumb({ product, round }: { product: Product; round?: boolean }) {
  const { t } = useTranslation()
  const image = product.imageFirst ?? product.images?.[0]?.lien
  return (
    <Link to={`/product/${product.id}`} className="w-[104px] shrink-0">
      <div
        className={`flex h-[104px] w-[104px] items-center justify-center overflow-hidden bg-slate-100 ${
          round ? 'rounded-full border border-gray-200' : 'rounded-xl'
        }`}
      >
        {image ? (
          <LazyImage
            src={image}
            alt={product.libelle}
            variant="fill"
            imgClassName={round ? 'object-cover' : ''}
            className={round ? 'h-full w-full' : 'h-full w-full'}
          />
        ) : (
          <span className="px-1 text-center text-[10px] leading-tight text-ink-soft">
            {product.libelle}
          </span>
        )}
      </div>
      {!round && (
        <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-ink">
          {product.libelle}
        </p>
      )}
    </Link>
  )
}

export default function StorePage() {
  const { t } = useTranslation()
  const { shopUserId } = useParams<{ shopUserId: string }>()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)
  const locale = useAppSelector((state) => state.auth.user?.locale ?? 'en')

  const [userShop, setUserShop] = useState<UserShop | null>(null)
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeTab, setActiveTab] = useState<'home' | 'products'>('products')
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
      setCategories(data.categories ?? [])
      if (data.userShop.hasShop) {
        setActiveTab('home')
      } else {
        setActiveTab('products')
      }
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
        const list = res.data ?? []
        setProducts((prev) => (append ? [...prev, ...list] : list))
        setLastPage(res.last_page ?? 1)
        setCurrentPage(page)
        if (list.length === 0 || page >= (res.last_page ?? 1)) {
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

  const activateHomeTab = () => setActiveTab('home')
  const activateProductsTab = () => setActiveTab('products')

  const renderHome = () => {
    const shopProducts = userShop?.products ?? []
    const newProducts = shopProducts.slice(0, 10)

    return (
      <div className="mt-4">
        {newProducts.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-bold text-ink">
              {t('new_products', { defaultValue: 'New products' })}
            </h2>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {newProducts.map((product) => (
                <ProductThumb key={product.id} product={product} round />
              ))}
            </div>
          </div>
        )}

        {categories.map((category) => (
          <div key={category.id} className="mb-6">
            <h2 className="mb-2 text-sm font-bold text-ink">
              {category.code}
            </h2>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {category.products.slice(0, 5).map((product) => (
                <ProductThumb key={product.id} product={product} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderProducts = () => (
    <div className="mt-4">
      {isLoading && products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-xs text-ink-soft">
          <img src="/site_images/index_loader.gif" alt="" className="w-[70px] rounded-sm" />
          {t('loading', { defaultValue: 'loading' })}
        </div>
      ) : products.length > 0 ? (
        <div className="columns-2 gap-3 [column-fill:_balance]">
          {products.map((product) => (
            <div key={product.id} className="mb-3 break-inside-avoid">
              <Link to={`/product/${product.id}`} className="block">
                <div className="overflow-hidden rounded-xl bg-white shadow-soft">
                  <div className="relative aspect-square bg-slate-100">
                    <LazyImage
                      src={product.imageFirst ?? product.images?.[0]?.lien}
                      alt={product.libelle}
                      variant="fill"
                      imgClassName="object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-[11px] font-medium leading-snug text-ink">
                      {product.libelle}
                    </p>
                  </div>
                </div>
              </Link>
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
  )

  const shopName = isOwner
    ? t('side_menu.my_store', { defaultValue: 'My Store' })
    : userShop?.shop_name_show || userShop?.username || ''

  const hasShop = userShop?.hasShop ?? false

  const tabs: StoreTab[] = [
    ...(hasShop ? [{ key: 'home' as const, labelKey: 'home', labelFallback: 'Home' }] : []),
    { key: 'products' as const, labelKey: 'products', labelFallback: 'Products' },
  ]

  if (!isLoggedIn) return <LoginPanel />

  if (isLoading && !userShop) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-xs text-ink-soft">
        <img src="/site_images/index_loader.gif" alt="" className="w-[70px] rounded-sm" />
        {t('loading', { defaultValue: 'loading' })}
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <section className="px-4 py-6">
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

          <div className="border-t border-black/5 px-4">
            <div className="flex items-center gap-8">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={tab.key === 'home' ? activateHomeTab : activateProductsTab}
                  className="pb-2.5 pt-2 text-sm font-bold text-ink transition hover:text-primary"
                >
                  {t(tab.labelKey, { defaultValue: tab.labelFallback })}
                  {activeTab === tab.key && (
                    <span className="mx-auto mt-1 block h-1 w-3/5 rounded-full bg-black" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-black/5 px-4 pb-4">
            {activeTab === 'home' ? renderHome() : renderProducts()}
          </div>
        </div>
      </section>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Swal from 'sweetalert2'
import { Eye, EyeOff, Loader2, PackagePlus, Plus, X, ImageOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MyProduct, Product, StoreCategory } from '../types'
import {
  fetchMyStoreData,
  fetchMyProducts,
  updateProductVisibility,
  addStock,
  submitForReview,
} from '../lib/api'
import { formatAmount } from '../lib/format'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'
import LazyImage from '../components/LazyImage'

interface StoreTab {
  key: 'home' | 'products'
  labelKey: string
  labelFallback: string
}

const STORE_TABS: StoreTab[] = [
  { key: 'home', labelKey: 'home', labelFallback: 'Home' },
  { key: 'products', labelKey: 'products', labelFallback: 'Products' },
]

function ProductThumb({ product, round }: { product: Product; round?: boolean }) {
  const { t } = useTranslation()
  const image = product.imageFirst ?? product.images?.[0]?.lien
  return (
    <div className="w-[104px] shrink-0">
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
          <ImageOff size={22} className="text-slate-300" />
        )}
      </div>
      <p className="break-libelle-product mt-1 text-center text-[11px] font-medium text-ink">
        {product.libelle}
      </p>
      {round && (
        <p className="mt-0.5 text-center text-[10px] font-semibold text-primary">
          {formatAmount(product.price, product.currency)}
        </p>
      )}
      <span className="sr-only">{t('products', { defaultValue: 'Products' })}</span>
    </div>
  )
}

interface OwnerCardProps {
  product: MyProduct
  approbationActive: boolean
  onToggleVisibility: (product: MyProduct) => void
  onAddStock: (product: MyProduct) => void
  onSubmitForReview: (product: MyProduct) => void
}

function OwnerProductCard({
  product,
  approbationActive,
  onToggleVisibility,
  onAddStock,
  onSubmitForReview,
}: OwnerCardProps) {
  const { t } = useTranslation()
  const image = product.imageFirst ?? product.images?.[0]?.lien
  const outOfStock = !product.is_digital && (product.quantity === 0 || product.quantity == null)
  const rejected =
    product.last_validation?.status === 'rejected' &&
    (product.last_validation.reasons?.length ?? 0) > 0

  return (
    <div className="break-inside-avoid overflow-hidden rounded-2xl border border-black/5 bg-white shadow-soft">
      <div className="relative">
        <div className="h-40">
          {image ? (
            <LazyImage
              src={image}
              alt={product.libelle}
              variant="fill"
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-100">
              <ImageOff size={26} className="text-slate-300" />
            </div>
          )}
        </div>
        {product.isBoosted && (
          <span className="absolute right-0 top-2 rounded-l bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
            {t('boost', { defaultValue: 'Boost' })}
          </span>
        )}
        {!product.isBoosted && product.isNew && (
          <span className="absolute right-0 top-2 rounded-l bg-yellow-300 px-2 py-0.5 text-[10px] font-bold text-black">
            {t('new', { defaultValue: 'New' })}
          </span>
        )}
      </div>

      <div className="p-2.5">
        <p className="break-libelle-product text-sm font-semibold text-gray">
          {product.libelle}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-sm font-semibold text-primary">
            {formatAmount(product.price, product.currency)}
          </span>
          {product.is_digital ? (
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {t('digital', { defaultValue: 'Digital' })}
            </span>
          ) : (
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {t('instock', { quantity: product.quantity ?? 0, defaultValue: '{quantity} in stock' })}
            </span>
          )}
        </div>

        {outOfStock && (
          <button
            type="button"
            onClick={() => onAddStock(product)}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-black px-2 py-1 text-[11px] font-bold text-white transition hover:opacity-90"
          >
            <Plus size={12} />
            {t('add_stock', { defaultValue: 'Add stock' })}
          </button>
        )}

        {approbationActive && product.status && (
          <p className="mt-2 text-right text-[10px] text-gray-500">
            {t(`product_${product.status}`, { defaultValue: product.status })}
          </p>
        )}

        {rejected && (
          <div className="mt-2 rounded-lg bg-red-50 p-2">
            <p className="text-center text-[10px] font-semibold text-red-600">
              {t('product_rejected_for_reasons', { defaultValue: 'Product disapproved for following reasons' })}
            </p>
            <ul className="mt-1 list-inside list-disc text-[10px] text-ink">
              {(product.last_validation?.reasons ?? []).map((reason, i) => (
                <li key={i} className="text-black">
                  {typeof reason === 'string' ? reason : ''}
                </li>
              ))}
            </ul>
            {!product.last_validation?.comment && (
              <button
                type="button"
                onClick={() => onSubmitForReview(product)}
                className="mt-2 w-full rounded-lg bg-primary px-2 py-1 text-[11px] font-bold text-white transition hover:bg-primary-dark"
              >
                {t('submit_for_review', { defaultValue: 'Submit for review' })}
              </button>
            )}
          </div>
        )}

        <div className="mt-2 flex justify-center gap-4 border-t border-black/5 pt-2">
          <button
            type="button"
            onClick={() => onToggleVisibility(product)}
            className="flex items-center gap-1 text-xs font-semibold text-ink transition hover:text-primary"
            aria-label={t('display', { defaultValue: 'Display' })}
          >
            {product.visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MyStorePage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)

  const [activeTab, setActiveTab] = useState<'home' | 'products'>('home')
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [lastProducts, setLastProducts] = useState<Product[]>([])
  const [products, setProducts] = useState<MyProduct[]>([])
  const [approbationActive, setApprobationActive] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [noMoreData, setNoMoreData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stockOpen, setStockOpen] = useState(false)
  const [stockQuantity, setStockQuantity] = useState('')
  const [stockSaving, setStockSaving] = useState(false)
  const stockProductRef = useRef<MyProduct | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)

  const hasShop = Boolean(user?.hasShop)

  const reinitPagination = () => {
    setCurrentPage(1)
    setLastPage(0)
    setNoMoreData(false)
  }

  const loadStoreData = useCallback(async () => {
    try {
      const data = await fetchMyStoreData(token ?? undefined)
      setCategories(data.categories ?? [])
      setLastProducts(data.products ?? [])
    } catch {
      // keep current data when the request fails
    }
  }, [token])

  const loadMyProducts = useCallback(
    async (page: number, append: boolean) => {
      if (lockRef.current) {
        setIsLoading(false)
        return
      }
      lockRef.current = true
      if (append) setIsLoadingMore(true)
      try {
        const data = await fetchMyProducts(token ?? undefined, page)
        setApprobationActive(Boolean(data.approbation_active))
        if (append) {
          setProducts((prev) => {
            const seen = new Set(prev.map((p) => p.id))
            const fresh = (data.products?.data ?? []).filter((p) => !seen.has(p.id))
            return [...prev, ...fresh]
          })
        } else {
          setProducts(data.products?.data ?? [])
        }
        setCurrentPage(page)
        setLastPage(data.products?.last_page ?? page)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('an_error_occured', { defaultValue: 'An error occurred' }))
      } finally {
        lockRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [token, user?.id, t],
  )

  useEffect(() => {
    if (!isLoggedIn) return
    setActiveTab(hasShop ? 'home' : 'products')
    reinitPagination()
    if (hasShop) {
      void loadStoreData()
    }
    setIsLoading(true)
    void loadMyProducts(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  const activateProductsTab = () => {
    setActiveTab('products')
    setProducts([])
    reinitPagination()
    setIsLoading(true)
    void loadMyProducts(1, false)
  }

  const activateHomeTab = () => {
    setActiveTab('home')
    void loadStoreData()
  }

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || activeTab !== 'products') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !isLoading &&
          !isLoadingMore &&
          !noMoreData &&
          lastPage > 0 &&
          currentPage < lastPage
        ) {
          void loadMyProducts(currentPage + 1, true)
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeTab, currentPage, lastPage, isLoading, isLoadingMore, noMoreData, loadMyProducts])

  const toggleVisibility = async (product: MyProduct) => {
    const action = product.visible
      ? t('you_going_hide_product', { defaultValue: 'You are going to hide this product' })
      : t('you_going_display_product', { defaultValue: 'You are going to display this product' })
    const result = await Swal.fire({
      icon: 'question',
      title: t('info', { defaultValue: 'Info' }),
      text: action,
      showCancelButton: true,
      confirmButtonText: t('yes', { defaultValue: 'Yes' }),
      cancelButtonText: t('no', { defaultValue: 'No' }),
      confirmButtonColor: '#ec11b5',
    })
    if (!result.isConfirmed) return

    try {
      const res = await updateProductVisibility(token ?? undefined, product.id)
      if (res.status === true) {
        const updated = res.product as MyProduct | undefined
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? (updated ?? { ...p, visible: !p.visible }) : p)),
        )
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: updated?.visible
            ? t('product_visible_now', { defaultValue: 'Product is now visible' })
            : t('product_hidden_now', { defaultValue: 'Product is now hidden' }),
          confirmButtonColor: '#ec11b5',
        })
      } else if (res.message === 'has_precommand') {
        const confirmation = await Swal.fire({
          icon: 'warning',
          title: t('info', { defaultValue: 'Info' }),
          text: `${t('this_product_contains_precommands', { defaultValue: 'This product contains precommands.' })} ${t('cancel_precommands_and_hide', { defaultValue: 'Cancel precommands and hide' })}`,
          showCancelButton: true,
          confirmButtonText: t('continue', { defaultValue: 'Continue' }),
          cancelButtonText: t('confirmation.no_cancel', { defaultValue: 'No, cancel' }),
          confirmButtonColor: '#ec11b5',
        })
        if (confirmation.isConfirmed) {
          const res2 = await updateProductVisibility(token ?? undefined, product.id, true)
          if (res2.product) {
            setProducts((prev) =>
              prev.map((p) => (p.id === product.id ? (res2.product as MyProduct) : p)),
            )
          }
        }
      } else {
        void Swal.fire({
          icon: 'error',
          title: t('info', { defaultValue: 'Info' }),
          text: t('an_error_occured', { defaultValue: 'An error occurred' }),
          confirmButtonColor: '#ec11b5',
        })
      }
    } catch {
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('an_error_occured', { defaultValue: 'An error occurred' }),
        confirmButtonColor: '#ec11b5',
      })
    }
  }

  const openAddStock = (product: MyProduct) => {
    stockProductRef.current = product
    setStockQuantity('')
    setStockOpen(true)
  }

  const sendStockRequest = async () => {
    const quantity = parseFloat(stockQuantity)
    if (!quantity || quantity === 0) {
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('quantity_required', { defaultValue: 'Quantity is required' }),
        confirmButtonColor: '#ec11b5',
      })
      return
    }
    const product = stockProductRef.current
    if (!product) return
    setStockSaving(true)
    try {
      const res = await addStock(token ?? undefined, product.id, quantity)
      if (res.status === true) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? ((res.product as MyProduct) ?? p) : p)),
        )
        setStockOpen(false)
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('stock_added_successfully', { defaultValue: 'Stock added successfully' }),
          confirmButtonColor: '#ec11b5',
        })
      }
    } catch {
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('an_error_occured', { defaultValue: 'An error occurred' }),
        confirmButtonColor: '#ec11b5',
      })
    } finally {
      setStockSaving(false)
    }
  }

  const handleSubmitForReview = async (product: MyProduct) => {
    const result = await Swal.fire({
      icon: 'question',
      title: t('confirmation.you_sure', { defaultValue: 'Are you sure?' }),
      showCancelButton: true,
      confirmButtonText: t('yes', { defaultValue: 'Yes' }),
      cancelButtonText: t('no', { defaultValue: 'No' }),
      confirmButtonColor: '#ec11b5',
    })
    if (!result.isConfirmed) return
    try {
      const res = await submitForReview(token ?? undefined, product.id)
      void Swal.fire({
        icon: res.status ? 'success' : 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: res.status
          ? t('submitted_for_review', { defaultValue: 'Submitted for review' })
          : t('an_error_occured', { defaultValue: 'An error occurred' }),
        confirmButtonColor: '#ec11b5',
      })
    } catch {
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('an_error_occured', { defaultValue: 'An error occurred' }),
        confirmButtonColor: '#ec11b5',
      })
    }
  }

  const renderHome = (): ReactNode => (
    <div className="mt-4 space-y-5">
      {lastProducts.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-primary-dark">
            {t('new_products', { defaultValue: 'New products' })}
          </h3>
          <div className="app-scroll flex gap-3 overflow-x-auto pb-2">
            {lastProducts
              .filter((p) => p && p.imageFirst)
              .map((product) => (
                <ProductThumb key={product.id} product={product} round />
              ))}
          </div>
        </div>
      )}

      {categories.map((category) => (
        <div key={category.id}>
          <div className="mb-2 flex items-center gap-2">
            {category.img && (
              <img
                src={`${import.meta.env.VITE_APP_BACKEND_URL ?? ''}/images/${category.img}`}
                alt=""
                className="h-6 w-6 object-contain"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            <h3 className="text-sm font-bold text-primary-dark">
              {t(`categories.${category.code}`, { defaultValue: category.code })}
            </h3>
          </div>
          {category.products.length > 0 && (
            <div className="app-scroll flex gap-3 overflow-x-auto pb-2">
              {category.products.slice(0, 5).map((product) => (
                <ProductThumb key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const renderProducts = (): ReactNode => (
    <div className="mt-4">
      {error && products.length === 0 && (
        <p className="rounded-xl bg-red-50 p-3 text-center text-xs font-medium text-red-600">{error}</p>
      )}
      {products.length > 0 ? (
        <div className="columns-2 gap-3 [column-fill:_balance]">
          {products.map((product) => (
            <div key={product.id} className="mb-3 break-inside-avoid">
              <OwnerProductCard
                product={product}
                approbationActive={approbationActive}
                onToggleVisibility={(p) => void toggleVisibility(p)}
                onAddStock={openAddStock}
                onSubmitForReview={(p) => void handleSubmitForReview(p)}
              />
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
        {isLoading || isLoadingMore ? (
          <Loader2 size={20} className="animate-spin text-primary" />
        ) : noMoreData && products.length > 0 ? (
          <span className="text-[11px] font-medium text-ink-soft">
            {t('no_more_data', { defaultValue: 'No more data' })}
          </span>
        ) : null}
      </div>
    </div>
  )

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
          <div
            className="h-24 w-full bg-cover bg-center"
            style={{ backgroundImage: "url('/site_images/shop_back.jpg')" }}
          />
          <div className="px-4 pb-3">
            <img
              src={user?.avatar && user.avatar !== 'pi.png' ? user.avatar : '/site_images/pi.png'}
              alt={user?.username ?? ''}
              className="-mt-7 h-[70px] w-[70px] rounded-full border-4 border-white object-cover shadow-soft"
            />
            <h1 className="mt-2 text-lg font-bold text-ink">
              {t('side_menu.my_store', { defaultValue: 'My store' })}
            </h1>
          </div>

          <div className="border-t border-black/5 px-4">
            <div className="flex items-center gap-8">
              {STORE_TABS.filter((tab) => tab.key !== 'home' || hasShop).map((tab) => (
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

      {!isLoggedIn && <LoginPanel />}

      {stockOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setStockOpen(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-primary-dark">
                {t('add_stock', { defaultValue: 'Add stock' })}
              </h3>
              <button
                type="button"
                onClick={() => setStockOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
                aria-label={t('close', { defaultValue: 'Close' })}
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-4">
              <label htmlFor="stock-quantity" className="mb-1 block text-[11px] font-semibold text-primary-dark">
                {t('instock', { quantity: 0, defaultValue: 'Quantity in stock' })}
              </label>
              <input
                id="stock-quantity"
                type="number"
                inputMode="numeric"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder={t('instock', { quantity: 0, defaultValue: 'Quantity in stock' })}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="button"
              onClick={() => void sendStockRequest()}
              disabled={stockSaving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3.5 text-sm font-bold text-white shadow-soft transition hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {stockSaving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <>
                  <PackagePlus size={17} strokeWidth={2.2} />
                  {t('add', { defaultValue: 'Add' })}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Product, CancellationReason } from '../../types'
import { fetchAdminProducts, validateProduct } from '../../lib/api'
import { formatDate, normalizeCancellationReasons } from '../../lib/format'
import { useAppSelector } from '../../store/hooks'
import LoginPanel from '../../components/LoginPanel'
import CancellationReasonsModal from '../../components/CancellationReasonsModal'

type ProductStatus = '' | 'pending' | 'validated' | 'rejected'

function AdminProductCard({
  product,
  onValidate,
  approbation_active,
}: {
  product: Product
  onValidate: (data: { product: Product; status: string }) => void
  approbation_active?: boolean
}) {
  const { t } = useTranslation()
  const image = product.imageFirst ?? product.images?.[0]?.lien
  const statusColor =
    product.status === 'validated'
      ? 'text-green-600'
      : product.status === 'rejected'
        ? 'text-red-500'
        : 'text-yellow-500'

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-soft">
      <Link to={`/product/${product.id}`} className="relative overflow-hidden">
        {image ? (
          <img src={image} alt={product.libelle} className="h-[140px] w-full object-cover" />
        ) : (
          <div className="flex h-[140px] w-full items-center justify-center bg-slate-100 text-[10px] text-slate-400">
            {product.libelle}
          </div>
        )}
        {product.status && (
          <span className={`absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
            {product.status}
          </span>
        )}
      </Link>
      <div className="p-2.5">
        <p className="truncate text-xs font-semibold text-ink">{product.libelle}</p>
        <p className="mt-0.5 text-[11px] text-ink-soft">
          {product.price} {product.currency ?? ''}
        </p>
        {product.user && (
          <p className="mt-0.5 text-[10px] text-ink-soft">
            @{product.user.username}
          </p>
        )}
        {product.created_at && (
          <p className="mt-0.5 text-[10px] text-ink-soft">
            {formatDate(product.created_at)}
          </p>
        )}
        {approbation_active && product.status !== 'validated' && product.status !== 'rejected' && (
          <div className="mt-2 flex gap-1">
            <button
              type="button"
              onClick={() => onValidate({ product, status: 'validated' })}
              className="flex-1 rounded-lg bg-green-500 px-2 py-1 text-[10px] font-bold text-white transition hover:opacity-90"
            >
              {t('validate', { defaultValue: 'Validate' })}
            </button>
            <button
              type="button"
              onClick={() => onValidate({ product, status: 'rejected' })}
              className="flex-1 rounded-lg bg-red-500 px-2 py-1 text-[10px] font-bold text-white transition hover:opacity-90"
            >
              {t('reject', { defaultValue: 'Reject' })}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const STATUS_OPTIONS: { value: ProductStatus; labelKey: string; labelFallback: string }[] = [
  { value: '', labelKey: 'admin.all', labelFallback: 'Tout' },
  { value: 'pending', labelKey: 'admin.pending', labelFallback: 'En attente' },
  { value: 'validated', labelKey: 'admin.validated', labelFallback: 'Validé' },
  { value: 'rejected', labelKey: 'admin.rejected', labelFallback: 'Rejeté' },
]

export default function AdminProductsPage() {
  const { t, i18n } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)

  const [products, setProducts] = useState<Product[]>([])
  const [status, setStatus] = useState<ProductStatus>('pending')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(2)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [noMoreData, setNoMoreData] = useState(false)
  const [approbationActive, setApprobationActive] = useState(false)
  const [reasonsOpen, setReasonsOpen] = useState(false)
  const [validationReasons, setValidationReasons] = useState<CancellationReason[]>([])
  const [pendingValidation, setPendingValidation] = useState<{ product: Product; status: string } | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)

  const loadData = useCallback(
    async (page: number, append: boolean) => {
      if (!user?.id || lockRef.current) return
      lockRef.current = true
      if (append) setIsLoadingMore(true)
      try {
        const res = await fetchAdminProducts(token ?? undefined, {
          page,
          search,
          connected_user_id: user.id,
          status,
        })
        const pagination = res.products
        if (append) {
          setProducts((prev) => {
            const seen = new Set(prev.map((p) => p.id))
            const fresh = (pagination.data ?? []).filter((p) => !seen.has(p.id))
            return [...prev, ...fresh]
          })
        } else {
          setProducts(pagination.data ?? [])
        }
        setCurrentPage(page)
        setLastPage(pagination.last_page ?? page)
        setApprobationActive(!!res.approbation_active)
        setValidationReasons(normalizeCancellationReasons(res.reasons, i18n.language))
      } catch {
        // silent
      } finally {
        lockRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [token, user?.id, search, status, i18n.language],
  )

  useEffect(() => {
    if (!isLoggedIn) return
    setProducts([])
    setCurrentPage(1)
    setLastPage(2)
    setNoMoreData(false)
    setIsLoading(true)
    void loadData(1, false)
  }, [isLoggedIn, loadData])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading && !isLoadingMore && !noMoreData && currentPage < lastPage) {
          void loadData(currentPage + 1, true)
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [currentPage, lastPage, isLoading, isLoadingMore, noMoreData, loadData])

  const handleValidate = (data: { product: Product; status: string }) => {
    if (data.status === 'rejected') {
      setPendingValidation(data)
      setReasonsOpen(true)
      return
    }
    void Swal.fire({
      icon: 'warning',
      title: t('confirmation.you_sure', { defaultValue: 'Are you sure?' }),
      showCancelButton: true,
      confirmButtonText: t('yes', { defaultValue: 'Yes' }),
      cancelButtonText: t('no', { defaultValue: 'No' }),
      confirmButtonColor: '#ec11b5',
    }).then((result) => {
      if (result.isConfirmed) {
        void performValidation(data.product.id, data.status, [])
      }
    })
  }

  const performValidation = async (productId: number, status: string, reasons: string[]) => {
    try {
      const res = await validateProduct(token ?? undefined, productId, status, reasons)
      if (res.status === true) {
        setProducts((prev) => prev.filter((p) => p.id !== productId))
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('saved', { defaultValue: 'Saved' }),
          confirmButtonColor: '#ec11b5',
        })
      } else {
        void Swal.fire({
          icon: 'error',
          title: 'Info',
          text: res.message ?? t('an_error_occured', { defaultValue: 'An error occurred' }),
          confirmButtonColor: '#ec11b5',
        })
      }
    } catch {
      void Swal.fire({
        icon: 'error',
        title: 'Info',
        text: t('an_error_occured', { defaultValue: 'An error occurred' }),
        confirmButtonColor: '#ec11b5',
      })
    }
  }

  const submitReasons = (reasons: CancellationReason[]) => {
    if (!pendingValidation) return
    const selected = reasons.filter((r) => r.selected).map((r) => r.code)
    if (selected.length === 0) return
    void performValidation(pendingValidation.product.id, pendingValidation.status, selected)
  }

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <input
                type="radio"
                name="status"
                value={opt.value}
                checked={status === opt.value}
                onChange={() => setStatus(opt.value)}
                className="accent-[#ec11b5]"
              />
              {t(opt.labelKey, { defaultValue: opt.labelFallback })}
            </label>
          ))}
        </div>

        <div className="mt-3 flex items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setProducts([])
                setCurrentPage(1)
                setLastPage(2)
                setIsLoading(true)
                void loadData(1, false)
              }
            }}
            placeholder={t('search', { defaultValue: 'Search' })}
            className="h-[30px] w-full rounded-full border border-primary bg-gray-200 px-4 text-sm text-ink outline-none transition focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => {
              setProducts([])
              setCurrentPage(1)
              setLastPage(2)
              setIsLoading(true)
              void loadData(1, false)
            }}
            className="-ml-9 flex h-[30px] items-center justify-center rounded-full bg-black px-3 text-white transition hover:opacity-90"
          >
            <Search size={16} />
          </button>
        </div>

        <div className="mt-4 min-h-[200px]">
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <AdminProductCard
                  key={product.id}
                  product={product}
                  onValidate={handleValidate}
                  approbation_active={approbationActive}
                />
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
      </section>

      {!isLoggedIn && <LoginPanel />}

      <CancellationReasonsModal
        open={reasonsOpen}
        reasons={validationReasons}
        onClose={() => {
          setReasonsOpen(false)
          setPendingValidation(null)
        }}
        onSubmit={submitReasons}
      />
    </div>
  )
}

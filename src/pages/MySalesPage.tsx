import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Loader2, MapPin, MessageSquare, Search, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CancellationReason, LineOrder } from '../types'
import { fetchSales, updateLineOrder } from '../lib/api'
import { formatAmount, formatDateTime, normalizeCancellationReasons } from '../lib/format'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'
import CancellationReasonsModal from '../components/CancellationReasonsModal'

interface SalesTab {
  key: 'in_progress' | 'shipped'
  labelKey: string
  labelFallback: string
}

const SALES_TABS: SalesTab[] = [
  { key: 'in_progress', labelKey: 'in_progress', labelFallback: 'In progress' },
  { key: 'shipped', labelKey: 'shipped', labelFallback: 'Shipped' },
]

function showFullAddress(shipping: unknown, t: (key: string, opts?: Record<string, string>) => string) {
  const full = (shipping ?? {}) as Record<string, unknown>
  const label = (key: string, fallback: string) => t(key, { defaultValue: fallback })
  const lines = [
    `${label('address.name', 'Name')} : <strong>${full.name ?? ''}</strong>`,
    `${label('address.country_name', 'Country')} : <strong>${full.country_name ?? ''}</strong>`,
    `${label('address.city', 'City')} : <strong>${full.city ?? ''}</strong>`,
    `${label('address.address', 'Address')} : <strong>${full.address ?? ''}</strong>`,
    `${label('address.phone_number', 'Phone number')} : <strong>${full.phone_number ?? ''}</strong>`,
    `${label('profilForm.email', 'E-mail')} : <strong>${full.email ?? ''}</strong>`,
  ]
  const title = `<div class="text-center font-semibold">${label('address.full_shipping_address', 'Full shipping address')}</div>`
  void Swal.fire({
    title: label('info', 'Info'),
    html: `${title}<br/><div class="text-left text-sm leading-relaxed">${lines.join('<br/>')}</div>`,
    confirmButtonColor: '#ec11b5',
  })
}

function SaleCard({
  line,
  onCancel,
  onAcceptCancellation,
  cancelling,
}: {
  line: LineOrder
  onCancel: (line: LineOrder) => void
  onAcceptCancellation: (line: LineOrder) => void
  cancelling: boolean
}) {
  const { t } = useTranslation()
  const product = line.product
  const buyer = line.order?.user
  const date = line.shipped ? line.shipped_at : line.order?.ordered_at
  const quantity = line.quantity ?? 0
  const price = line.price_converted ?? line.product?.price ?? 0
  const currency = line.currency_conversion ?? ''
  const purchaseTotal = line.purchaseData?.total ?? (line.total ?? 0) + (line.fee ?? 0)

  return (
    <div className="mb-3 rounded-2xl border border-black/5 bg-white p-3 shadow-soft">
      <div className="flex items-start justify-between">
        <span
          className={`text-xs font-bold ${line.shipped ? 'text-primary' : 'text-ink'}`}
        >
          {line.shipped
            ? t('shipped', { defaultValue: 'Shipped' })
            : t('ordered', { defaultValue: 'Ordered' })}
        </span>
        {date && <em className="text-[11px] text-ink-soft">{formatDateTime(date)}</em>}
      </div>

      <div className="my-2 h-px bg-black/5" />

      {line.reference && (
        <p className="mb-1 text-[11px] font-bold text-primary"># {line.reference}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/store/${buyer?.id ?? ''}`}
          className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-ink"
        >
          <img
            src={buyer?.avatar}
            alt=""
            className="h-4 w-4 rounded-full object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.visibility = 'hidden'
            }}
          />
          <span className="truncate">{buyer?.shortname ?? buyer?.username ?? ''}</span>
        </Link>
        <button
          type="button"
          onClick={() => !line.noshipping && showFullAddress(line.order?.shipping, t)}
          className="flex min-w-0 max-w-[55%] items-center gap-1 text-[11px] font-medium text-primary"
        >
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{line.shippingAddress ?? ''}</span>
        </button>
      </div>

      <div className="mt-2.5 flex gap-3">
        <Link
          to={`/product/${product?.id ?? ''}`}
          className="h-[100px] w-[100px] shrink-0 overflow-hidden rounded-lg border border-black/10 bg-slate-100"
        >
          {product?.imageFirst ? (
            <img src={product.imageFirst} alt={product?.libelle ?? ''} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
              {product?.libelle ?? ''}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-ink">{product?.libelle ?? ''}</p>
          <p className="mt-1 text-xs font-semibold text-primary">
            {formatAmount(price, currency)}
            <span className="ml-2 text-[11px] font-medium text-ink-soft">
              {quantity}x {t('item', { defaultValue: 'Item' })}
            </span>
          </p>
          {line.shipping_info?.final_free_shipping ? (
            <p className="mt-1 text-[11px] text-ink-soft">
              {t('free_shipping.text', { defaultValue: 'Free shipping' })}
            </p>
          ) : line.purchaseData?.shipping_fee ? (
            <p className="mt-1 text-[11px] text-ink-soft">
              {t('shipping_cost', {
                defaultValue: 'Shipping cost : {amount}',
                amount: formatAmount(line.purchaseData.shipping_fee),
              })}
            </p>
          ) : line.purchaseData?.handling_fee ? (
            <p className="mt-1 text-[11px] text-ink-soft">
              {t('handling_fee_percentage', {
                defaultValue: 'Handling fee: {amount}',
                amount: formatAmount(line.purchaseData.handling_fee),
              })}
            </p>
          ) : line.noshipping ? (
            <p className="mt-1 text-[11px] text-ink-soft">
              {t('address.no_shipping', { defaultValue: 'No shipping' })}
            </p>
          ) : null}
          <p className="mt-1 text-right text-xs font-semibold text-primary">
            {t('total_display', {
              defaultValue: 'Total : {amount}',
              amount: formatAmount(purchaseTotal),
            })}
          </p>
        </div>
      </div>

      {!line.shipped_at && (
        <Link
          to={`/messages/${buyer?.id ?? ''}/${line.id}`}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          <MessageSquare size={14} />
          <span>{t('discuss_with_buyer', { defaultValue: 'Discuss with the buyer' })}</span>
          {line.messages_count ? (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {line.messages_count > 10 ? '10+' : line.messages_count}
            </span>
          ) : null}
        </Link>
      )}

      <div className="mt-2 flex gap-1.5">
        <Link
          to={`/shipping-management/line-order/${line.id}`}
          className={`flex items-center justify-center gap-1 rounded-lg bg-black px-2 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90 ${
            !line.shipped_at && !line.cancelled_at ? 'w-[45%]' : 'w-full'
          }`}
        >
          <Truck size={13} />
          <span>{t('shipping_confirmation', { defaultValue: 'Shipping confirmation' })}</span>
          {typeof line.statusPercentDisplay === 'number' && (
            <span className="text-primary">{line.statusPercentDisplay}%</span>
          )}
        </Link>
        {!line.shipped_at && !line.cancelled_at && (
          <div className="flex flex-1 pl-1">
            {!line.cancellableDirectly && line.line_order_cancellation !== null ? (
              <button
                type="button"
                onClick={() => onAcceptCancellation(line)}
                disabled={cancelling}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-black/20 px-2 py-1.5 text-[11px] font-bold text-ink transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling ? <Loader2 size={12} className="animate-spin" /> : null}
                {t('accept buyer cancel order request', {
                  defaultValue: 'Accept buyer cancel order request',
                })}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCancel(line)}
                disabled={cancelling}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-black/20 px-2 py-1.5 text-[11px] font-bold text-ink transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling && <Loader2 size={12} className="animate-spin" />}
                {t('cancel', { defaultValue: 'Cancel' })}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MySalesPage() {
  const { t, i18n } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)

  const [activeTab, setActiveTab] = useState<'in_progress' | 'shipped'>('in_progress')
  const [sales, setSales] = useState<LineOrder[]>([])
  const [reference, setReference] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(2)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [noMoreData, setNoMoreData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancellationReasons, setCancellationReasons] = useState<CancellationReason[]>([])
  const [reasonsOpen, setReasonsOpen] = useState(false)
  const [pendingCancelLine, setPendingCancelLine] = useState<LineOrder | null>(null)
  const [cancellingIds, setCancellingIds] = useState<Record<number, boolean>>({})
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)
  const referenceRef = useRef(reference)
  referenceRef.current = reference

  const shipped = activeTab === 'shipped' ? 'true' : 'false'

  const loadSales = useCallback(
    async (page: number, append: boolean) => {
      if (!user?.id || lockRef.current) return
      lockRef.current = true
      if (append) setIsLoadingMore(true)
      try {
        const res = await fetchSales(token ?? undefined, {
          seller_id: user.id,
          shipped,
          page,
          reference: referenceRef.current || undefined,
        })
        const pagination = res.sales_line_orders
        if (append) {
          setSales((prev) => {
            const seen = new Set(prev.map((line) => line.id))
            const fresh = (pagination.data ?? []).filter((line) => !seen.has(line.id))
            return [...prev, ...fresh]
          })
        } else {
          setSales(pagination.data ?? [])
        }
        setCurrentPage(page)
        setLastPage(pagination.last_page ?? page)
        setCancellationReasons(
          normalizeCancellationReasons(res.seller_order_cancellation_reasons, i18n.language),
        )
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('an_error_occured', { defaultValue: 'An error occurred' }))
      } finally {
        lockRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [token, user?.id, shipped, i18n.language, t],
  )

  useEffect(() => {
    if (!isLoggedIn) return
    setSales([])
    setCurrentPage(1)
    setLastPage(2)
    setNoMoreData(false)
    setIsLoading(true)
    void loadSales(1, false)
  }, [isLoggedIn, loadSales])

  const callSearch = () => {
    setSales([])
    setCurrentPage(1)
    setLastPage(2)
    setNoMoreData(false)
    setIsLoading(true)
    void loadSales(1, false)
  }

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !isLoading &&
          !isLoadingMore &&
          !noMoreData &&
          currentPage < lastPage
        ) {
          void loadSales(currentPage + 1, true)
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [currentPage, lastPage, isLoading, isLoadingMore, noMoreData, loadSales])

  const initCancellation = (line: LineOrder) => {
    setPendingCancelLine(line)
    setReasonsOpen(true)
  }

  const cancelOrder = async (reasons: CancellationReason[]) => {
    if (!pendingCancelLine) return
    const index = sales.findIndex((line) => line.id === pendingCancelLine.id)
    if (index < 0) return
    const id = pendingCancelLine.id
    setCancellingIds((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await updateLineOrder(token ?? undefined, pendingCancelLine.id, {
        type: 'cancelled_at',
        reasons,
      })
      if (res.status === true) {
        setSales((prev) => prev.filter((line) => line.id !== pendingCancelLine.id))
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('saved', { defaultValue: 'Saved' }),
          confirmButtonColor: '#ec11b5',
        })
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
    } finally {
      setCancellingIds((prev) => ({ ...prev, [id]: false }))
      setPendingCancelLine(null)
    }
  }

  const acceptCancellationRequest = async (line: LineOrder) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: t('info', { defaultValue: 'Info' }),
      text: t('the order is going to be cancelled', {
        defaultValue: 'The order is going to be cancelled',
      }),
      showCancelButton: true,
      confirmButtonText: t('confirmation.yes_continue', { defaultValue: 'Yes, continue!' }),
      cancelButtonText: t('confirmation.no_cancel', { defaultValue: 'No, cancel' }),
      confirmButtonColor: '#ec11b5',
    })
    if (!result.isConfirmed) return
    setCancellingIds((prev) => ({ ...prev, [line.id]: true }))
    try {
      const res = await updateLineOrder(token ?? undefined, line.id, {
        type: 'cancellation_confirmation_by_seller',
      })
      if (res.status === true) {
        setSales((prev) => prev.filter((item) => item.id !== line.id))
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('saved', { defaultValue: 'Saved' }),
          confirmButtonColor: '#ec11b5',
        })
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
    } finally {
      setCancellingIds((prev) => ({ ...prev, [line.id]: false }))
    }
  }

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
          <div
            className="h-[90px] w-full bg-cover bg-center"
            style={{ backgroundImage: "url('/site_images/backk.PNG')" }}
          />
          <div className="px-4 pb-3">
            <img
              src={user?.avatar && user.avatar !== 'pi.png' ? user.avatar : '/site_images/pi.png'}
              alt={user?.username ?? ''}
              className="-mt-7 h-[70px] w-[70px] rounded-full border-4 border-white object-cover shadow-soft"
            />
          </div>
        </div>

        <div className="mt-3 flex w-[60%] items-center gap-8">
          {SALES_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              disabled={isLoading}
              onClick={() => setActiveTab(tab.key)}
              className="pb-2 pt-2 text-sm font-bold text-ink transition hover:text-primary disabled:opacity-60"
            >
              {t(tab.labelKey, { defaultValue: tab.labelFallback })}
              {activeTab === tab.key && (
                <span className="mx-auto mt-1 block h-1 w-3/5 rounded-full bg-black" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <div className="flex items-center">
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') callSearch()
              }}
              placeholder={t('type the order reference', { defaultValue: "Type the order's reference ..." })}
              className="h-[30px] w-full rounded-full border border-primary bg-gray-200 px-4 text-sm text-ink outline-none transition focus:bg-white focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={callSearch}
              className="-ml-9 flex h-[30px] items-center justify-center rounded-full bg-black px-3 text-white transition hover:opacity-90"
              aria-label={t('search', { defaultValue: 'Search' })}
            >
              <Search size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-[200px]">
          {error && sales.length === 0 && (
            <p className="rounded-xl bg-red-50 p-3 text-center text-xs font-medium text-red-600">{error}</p>
          )}
          {sales.length > 0 ? (
            sales.map((line) => (
              <SaleCard
                key={line.id}
                line={line}
                cancelling={!!cancellingIds[line.id]}
                onCancel={initCancellation}
                onAcceptCancellation={(l) => void acceptCancellationRequest(l)}
              />
            ))
          ) : (
            !isLoading && !error && (
              <p className="py-8 text-center text-xs font-medium text-ink-soft">
                {t('no_data', { defaultValue: 'No data' })}
              </p>
            )
          )}
          <div ref={sentinelRef} className="flex justify-center py-6">
            {isLoading || isLoadingMore ? (
              <Loader2 size={20} className="animate-spin text-primary" />
            ) : noMoreData && sales.length > 0 ? (
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
        reasons={cancellationReasons}
        onClose={() => {
          setReasonsOpen(false)
          setPendingCancelLine(null)
        }}
        onSubmit={(reasons) => void cancelOrder(reasons)}
      />
    </div>
  )
}

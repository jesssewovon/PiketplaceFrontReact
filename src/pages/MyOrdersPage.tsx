import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Loader2, MapPin, MessageSquare, Search, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CancellationReason, LineOrder } from '../types'
import { fetchOrders, fetchShippedOrders, updateLineOrder } from '../lib/api'
import { formatAmount, formatDate } from '../lib/format'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'
import CancellationReasonsModal from '../components/CancellationReasonsModal'

type OrdersTab = 'in_progress' | 'shipped'

function showFullAddress(shipping: unknown, t: (key: string, opts?: Record<string, string>) => string) {
  const full = (shipping ?? {}) as Record<string, unknown>
  const label = (key: string, fallback: string) => t(key, { defaultValue: fallback })
  const title = `<div class="text-center font-semibold">${label('address.full_shipping_address', 'Full shipping address')}</div>`
  const lines = [
    `${label('address.name', 'Name')} : <strong>${full.name ?? ''}</strong>`,
    `${label('address.country_name', 'Country')} : <strong>${full.country_name ?? ''}</strong>`,
    `${label('address.city', 'City')} : <strong>${full.city ?? ''}</strong>`,
    `${label('address.address', 'Address')} : <strong>${full.address ?? ''}</strong>`,
    `${label('address.phone_number', 'Phone number')} : <strong>${full.phone_number ?? ''}</strong>`,
    `${label('profilForm.email', 'E-mail')} : <strong>${full.email ?? ''}</strong>`,
  ]
  void Swal.fire({
    title: label('info', 'Info'),
    html: `${title}<br/><div class="text-left text-sm leading-relaxed">${lines.join('<br/>')}</div>`,
    confirmButtonColor: '#ec11b5',
  })
}

function OrderCard({
  line,
  onCancel,
  onCancelRequest,
}: {
  line: LineOrder
  onCancel: (line: LineOrder) => void
  onCancelRequest: (line: LineOrder) => void
}) {
  const { t } = useTranslation()
  const product = line.product
  const seller = line.product?.user
  const date = line.shipped_at ? line.shipped_at : line.order?.ordered_at
  const quantity = line.quantity ?? 0
  const price = line.price_converted ?? line.product?.price ?? 0
  const currency = line.currency_conversion ?? ''
  const purchaseTotal = line.purchaseData?.total ?? (line.total ?? 0) + (line.fee ?? 0)
  const cancellable = !line.shipped_at && !line.cancelled_at

  return (
    <div className="mb-3 rounded-2xl border border-black/5 bg-white p-3 shadow-soft">
      <div className="flex items-start justify-between">
        <span className={`text-xs font-bold ${line.shipped_at ? 'text-primary' : 'text-ink'}`}>
          {line.shipped_at
            ? t('shipped', { defaultValue: 'Shipped' })
            : t('ordered', { defaultValue: 'Ordered' })}
        </span>
        {date && <em className="text-[11px] text-ink-soft">{formatDate(date)}</em>}
      </div>

      <div className="my-2 h-px bg-black/5" />

      {line.reference && <p className="mb-1 text-[11px] font-bold text-primary"># {line.reference}</p>}

      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/store/${seller?.id ?? ''}`}
          className="flex min-w-0 items-center gap-1 text-xs font-semibold text-ink"
        >
          <svg
            className="shrink-0"
            width="13px"
            height="13px"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="#a63289"
          >
            <g>
              <path d="M20.5,18A3.5,3.5,0,0,1,17,21.5H14.53V19a2.5,2.5,0,0,0-5,0v2.5H7A3.5,3.5,0,0,1,3.5,18V13.35A5.634,5.634,0,0,0,5.99,14,4.409,4.409,0,0,0,9,12.78a4.3,4.3,0,0,0,6,0A4.409,4.409,0,0,0,18.01,14a5.634,5.634,0,0,0,2.49-.65Zm.974-9.158L20.386,5.577A4.494,4.494,0,0,0,16.117,2.5H7.883A4.494,4.494,0,0,0,3.614,5.577L2.526,8.842A.5.5,0,0,0,2.5,9a3.5,3.5,0,0,0,3.49,3.5A3.853,3.853,0,0,0,9,11.034a3.809,3.809,0,0,0,6.006,0A3.854,3.854,0,0,0,18.01,12.5,3.5,3.5,0,0,0,21.5,9,.5.5,0,0,0,21.474,8.842Z" />
            </g>
          </svg>
          <span className="truncate">{seller?.shortShopname ?? seller?.shortname ?? ''}</span>
          <span className="shrink-0 text-ink-soft">›</span>
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
          to={`/message-contacts?corresponding_id=${seller?.id ?? ''}&line_order_id=${line.id}`}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          <MessageSquare size={14} />
          <span>{t('discuss_with_seller', { defaultValue: 'Discuss with the seller' })}</span>
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
            cancellable ? 'w-[45%]' : 'w-full'
          }`}
        >
          <Truck size={13} />
          <span>{t('shipping_confirmation', { defaultValue: 'Shipping confirmation' })}</span>
          {typeof line.statusPercentDisplay === 'number' && (
            <span className="text-primary">{line.statusPercentDisplay}%</span>
          )}
        </Link>
        {cancellable && (
          <div className="flex flex-1 pl-1">
            {line.cancellableDirectly ? (
              <button
                type="button"
                onClick={() => onCancel(line)}
                className="w-full rounded-lg border border-black/20 px-2 py-1.5 text-[11px] font-bold text-ink transition hover:bg-black/5"
              >
                <span className="mr-1">×</span>
                {t('cancel', { defaultValue: 'Cancel' })}
              </button>
            ) : line.line_order_cancellation === null ? (
              <button
                type="button"
                onClick={() => onCancel(line)}
                className="w-full rounded-lg border border-black/20 px-2 py-1.5 text-[11px] font-bold text-ink transition hover:bg-black/5"
              >
                <span className="mr-1">×</span>
                {t('request order cancellation', { defaultValue: 'Request order cancellation' })}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCancelRequest(line)}
                className="w-full rounded-lg border border-black/20 px-2 py-1.5 text-[11px] font-bold text-ink transition hover:bg-black/5"
              >
                <span className="mr-1">×</span>
                {t('cancel request for order cancellation', {
                  defaultValue: 'Cancel request for order cancellation',
                })}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyOrdersPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)

  const [activeTab, setActiveTab] = useState<OrdersTab>('in_progress')
  const [orders, setOrders] = useState<LineOrder[]>([])
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
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)
  const referenceRef = useRef(reference)
  referenceRef.current = reference

  const loadOrders = useCallback(
    async (page: number, append: boolean) => {
      if (!user?.id || lockRef.current) return
      lockRef.current = true
      if (append) setIsLoadingMore(true)
      try {
        const res = activeTab === 'in_progress'
          ? await fetchOrders(token ?? undefined, {
              user_id: user.id,
              page,
              reference: referenceRef.current || undefined,
            })
          : await fetchShippedOrders(token ?? undefined, {
              user_id: user.id,
              page,
              reference: referenceRef.current || undefined,
            })
        const pagination = res.line_orders
        if (append) {
          setOrders((prev) => {
            const seen = new Set(prev.map((line) => line.id))
            const fresh = (pagination.data ?? []).filter((line) => !seen.has(line.id))
            return [...prev, ...fresh]
          })
        } else {
          setOrders(pagination.data ?? [])
        }
        setCurrentPage(page)
        setLastPage(pagination.last_page ?? page)
        setCancellationReasons(res.buyer_order_cancellation_reasons ?? [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('an_error_occured', { defaultValue: 'An error occurred' }))
      } finally {
        lockRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [token, user?.id, activeTab, t],
  )

  useEffect(() => {
    if (!isLoggedIn) return
    setOrders([])
    setCurrentPage(1)
    setLastPage(2)
    setNoMoreData(false)
    setIsLoading(true)
    void loadOrders(1, false)
  }, [isLoggedIn, loadOrders])

  const callSearch = () => {
    setOrders([])
    setCurrentPage(1)
    setLastPage(2)
    setNoMoreData(false)
    setIsLoading(true)
    void loadOrders(1, false)
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
          void loadOrders(currentPage + 1, true)
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [currentPage, lastPage, isLoading, isLoadingMore, noMoreData, loadOrders])

  const initCancellation = (line: LineOrder) => {
    setPendingCancelLine(line)
    setReasonsOpen(true)
  }

  const applyResult = (id: number, resLineOrder: LineOrder | null) => {
    setOrders((prev) => {
      if (resLineOrder === null) {
        return prev.filter((line) => line.id !== id)
      }
      return prev.map((line) => (line.id === id ? resLineOrder : line))
    })
  }

  const cancelOrder = async (reasons: CancellationReason[]) => {
    if (!pendingCancelLine) return
    try {
      const res = await updateLineOrder(token ?? undefined, pendingCancelLine.id, {
        type: 'cancelled_at',
        reasons,
      })
      if (res.status === true) {
        applyResult(pendingCancelLine.id, (res.line_order as LineOrder | null) ?? null)
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('cancelled_successfully', { defaultValue: 'Cancelled successfully' }),
          confirmButtonColor: '#ec11b5',
        })
      } else if (res.message) {
        void Swal.fire({
          icon: 'error',
          title: t('info', { defaultValue: 'Info' }),
          text: t(String(res.message), { defaultValue: String(res.message) }),
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
      setPendingCancelLine(null)
    }
  }

  const cancelRequestForCancellation = async (line: LineOrder) => {
    try {
      const res = await updateLineOrder(token ?? undefined, line.id, {
        type: 'cancel_request_for_order_cancellation',
      })
      if (res.status === true) {
        applyResult(line.id, (res.line_order as LineOrder | null) ?? null)
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('cancelled_successfully', { defaultValue: 'Cancelled successfully' }),
          confirmButtonColor: '#ec11b5',
        })
      } else if (res.message) {
        void Swal.fire({
          icon: 'error',
          title: t('info', { defaultValue: 'Info' }),
          text: t(String(res.message), { defaultValue: String(res.message) }),
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

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="mt-3 flex w-[60%] items-center gap-8">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setActiveTab('in_progress')}
            className="pb-2 pt-2 text-sm font-bold text-ink transition hover:text-primary disabled:opacity-60"
          >
            {t('in_progress', { defaultValue: 'In progress' })}
            {activeTab === 'in_progress' && (
              <span className="mx-auto mt-1 block h-1 w-3/5 rounded-full bg-black" />
            )}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setActiveTab('shipped')}
            className="pb-2 pt-2 text-sm font-bold text-ink transition hover:text-primary disabled:opacity-60"
          >
            {t('shipped', { defaultValue: 'Shipped' })}
            {activeTab === 'shipped' && (
              <span className="mx-auto mt-1 block h-1 w-3/5 rounded-full bg-black" />
            )}
          </button>
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
          {error && orders.length === 0 && (
            <p className="rounded-xl bg-red-50 p-3 text-center text-xs font-medium text-red-600">{error}</p>
          )}
          {orders.length > 0 ? (
            orders.map((line) => (
              <OrderCard
                key={line.id}
                line={line}
                onCancel={initCancellation}
                onCancelRequest={(l) => void cancelRequestForCancellation(l)}
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
            ) : noMoreData && orders.length > 0 ? (
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

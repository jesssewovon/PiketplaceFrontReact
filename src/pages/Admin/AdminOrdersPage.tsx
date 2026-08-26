import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Loader2, MapPin, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LineOrder } from '../../types'
import { fetchAdminOrders, fetchAdminShippedOrders, fetchPreOrders } from '../../lib/api'
import { formatAmount, formatDate } from '../../lib/format'
import { useAppSelector } from '../../store/hooks'
import LoginPanel from '../../components/LoginPanel'

type OrdersTab = 'orders' | 'shipped' | 'pre_orders'

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
  ]
  void Swal.fire({
    title: label('info', 'Info'),
    html: `${title}<br/><div class="text-left text-sm leading-relaxed">${lines.join('<br/>')}</div>`,
    confirmButtonColor: '#ec11b5',
  })
}

function AdminOrderCard({ line }: { line: LineOrder }) {
  const { t } = useTranslation()
  const product = line.product
  const seller = line.product?.user
  const buyer = line.order?.user
  const date = line.shipped_at ? line.shipped_at : line.order?.ordered_at
  const quantity = line.quantity ?? 0
  const price = line.price ?? 0
  const total = line.total ?? 0
  const fee = line.fee ?? 0

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

      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/store/${seller?.id ?? ''}`}
          className="flex min-w-0 items-center gap-1 text-xs font-semibold text-ink"
        >
          <svg className="shrink-0" width="13px" height="13px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#a63289">
            <g>
              <path d="M20.5,18A3.5,3.5,0,0,1,17,21.5H14.53V19a2.5,2.5,0,0,0-5,0v2.5H7A3.5,3.5,0,0,1,3.5,18V13.35A5.634,5.634,0,0,0,5.99,14,4.409,4.409,0,0,0,9,12.78a4.3,4.3,0,0,0,6,0A4.409,4.409,0,0,0,18.01,14a5.634,5.634,0,0,0,2.49-.65Zm.974-9.158L20.386,5.577A4.494,4.494,0,0,0,16.117,2.5H7.883A4.494,4.494,0,0,0,3.614,5.577L2.526,8.842A.5.5,0,0,0,2.5,9a3.5,3.5,0,0,0,3.49,3.5A3.853,3.853,0,0,0,9,11.034a3.809,3.809,0,0,0,6.006,0A3.854,3.854,0,0,0,18.01,12.5,3.5,3.5,0,0,0,21.5,9,.5.5,0,0,0,21.474,8.842Z" />
            </g>
          </svg>
          <span className="truncate">{seller?.shortShopname ?? seller?.shortname ?? seller?.username ?? ''}</span>
          <span className="shrink-0 text-ink-soft">›</span>
        </Link>
        <button
          type="button"
          onClick={() => !line.noshipping && showFullAddress(line.order?.shipping, t)}
          className="flex min-w-0 max-w-[55%] items-center gap-1 text-[11px] font-medium text-primary"
        >
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{line.shippingAddress ?? `${line.order?.shipping?.country_name ?? ''}, ${line.order?.shipping?.city ?? ''}`}</span>
        </button>
      </div>

      <div className="mt-2.5 flex gap-3">
        <Link to={`/product/${product?.id ?? ''}`} className="h-[100px] w-[100px] shrink-0 overflow-hidden rounded-lg border border-black/10 bg-slate-100">
          {product?.imageFirst ? (
            <img src={product.imageFirst} alt={product?.libelle ?? ''} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">{product?.libelle ?? ''}</span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-ink">{product?.libelle ?? ''}</p>
          <p className="mt-1 text-xs font-semibold text-primary">
            {formatAmount(price)}
            <span className="ml-2 text-[11px] font-medium text-ink-soft">
              {quantity}x {t('item', { defaultValue: 'Item' })}
            </span>
          </p>
          {line.shipping_info?.final_free_shipping ? (
            <p className="mt-1 text-[11px] text-ink-soft">{t('free_shipping.text', { defaultValue: 'Free shipping' })}</p>
          ) : fee > 0 ? (
            <p className="mt-1 text-[11px] text-ink-soft">
              {t('shipping_cost', { defaultValue: 'Shipping cost : {amount}', amount: formatAmount(fee) })}
            </p>
          ) : line.noshipping ? (
            <p className="mt-1 text-[11px] text-ink-soft">{t('address.no_shipping', { defaultValue: 'No shipping' })}</p>
          ) : null}
          <p className="mt-1 text-right text-xs font-semibold text-primary">
            {t('total_display', { defaultValue: 'Total : {amount}', amount: formatAmount(total + fee) })}
          </p>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <Link
          to={`/shipping-management/line-order/${line.id}`}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-black px-2 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90"
        >
          <Truck size={13} />
          <span>{t('shipping_confirmation', { defaultValue: 'Shipping confirmation' })}</span>
          {typeof line.statusPercentDisplay === 'number' && (
            <span className="text-primary">{line.statusPercentDisplay}%</span>
          )}
        </Link>
      </div>

      <div className="mt-2 flex gap-3 text-[11px] text-primary">
        {seller && <span>Seller: @{seller.username}</span>}
        {buyer && <span>Buyer: @{buyer.username}</span>}
      </div>
      {!line.noshipping && line.order?.shipping && (
        <p className="mt-1 text-[10px] text-ink-soft">
          {line.order.shipping.country_name}, {line.order.shipping.city}, {line.order.shipping.address}
        </p>
      )}
    </div>
  )
}

function PreOrderCard({ line }: { line: LineOrder }) {
  const { t } = useTranslation()
  const product = line.product
  const seller = line.product?.user
  const quantity = line.quantity ?? 0
  const price = product?.price ?? 0
  const total = line.total ?? 0
  const fee = line.fee ?? 0

  return (
    <div className="mb-3 rounded-2xl border border-black/5 bg-white p-3 shadow-soft">
      <div className="flex items-start justify-between">
        <span />
        {line.created_at && <em className="text-[11px] text-ink-soft">{formatDate(line.created_at)}</em>}
      </div>

      <div className="my-2 h-px bg-black/5" />

      <div className="flex items-center justify-between gap-2">
        <Link to={`/store/${seller?.id ?? ''}`} className="flex min-w-0 items-center gap-1 text-xs font-semibold text-ink">
          <span className="truncate">{seller?.shortShopname ?? seller?.shortname ?? seller?.username ?? ''}</span>
          <span className="shrink-0 text-ink-soft">›</span>
        </Link>
      </div>

      <div className="mt-2.5 flex gap-3">
        <Link to={`/product/${product?.id ?? ''}`} className="h-[100px] w-[100px] shrink-0 overflow-hidden rounded-lg border border-black/10 bg-slate-100">
          {product?.imageFirst ? (
            <img src={product.imageFirst} alt={product?.libelle ?? ''} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">{product?.libelle ?? ''}</span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-ink">{product?.libelle ?? ''}</p>
          <p className="mt-1 text-xs font-semibold text-primary">
            {formatAmount(price)}
            <span className="ml-2 text-[11px] font-medium text-ink-soft">
              {quantity}x {t('item', { defaultValue: 'Item' })}
            </span>
          </p>
          <p className="mt-1 text-right text-xs font-semibold text-primary">
            {t('total_display', { defaultValue: 'Total : {amount}', amount: formatAmount(total) })}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AdminOrdersPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)

  const [activeTab, setActiveTab] = useState<OrdersTab>('orders')
  const [lineOrders, setLineOrders] = useState<LineOrder[]>([])
  const [preOrders, setPreOrders] = useState<LineOrder[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(2)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [noMoreData, setNoMoreData] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)

  const loadOrders = useCallback(
    async (page: number, append: boolean) => {
      if (lockRef.current) return
      lockRef.current = true
      if (append) setIsLoadingMore(true)
      try {
        const res = await fetchAdminOrders(token ?? undefined, page)
        const pagination = res.line_orders
        if (append) {
          setLineOrders((prev) => {
            const seen = new Set(prev.map((l) => l.id))
            const fresh = (pagination.data ?? []).filter((l) => !seen.has(l.id))
            return [...prev, ...fresh]
          })
        } else {
          setLineOrders(pagination.data ?? [])
        }
        setCurrentPage(page)
        setLastPage(pagination.last_page ?? page)
      } catch {
        // silent
      } finally {
        lockRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [token],
  )

  const loadShipped = useCallback(
    async (page: number, append: boolean) => {
      if (lockRef.current) return
      lockRef.current = true
      if (append) setIsLoadingMore(true)
      try {
        const res = await fetchAdminShippedOrders(token ?? undefined, page)
        const pagination = res.line_orders
        if (append) {
          setLineOrders((prev) => {
            const seen = new Set(prev.map((l) => l.id))
            const fresh = (pagination.data ?? []).filter((l) => !seen.has(l.id))
            return [...prev, ...fresh]
          })
        } else {
          setLineOrders(pagination.data ?? [])
        }
        setCurrentPage(page)
        setLastPage(pagination.last_page ?? page)
      } catch {
        // silent
      } finally {
        lockRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [token],
  )

  const loadPreOrders = useCallback(
    async (page: number, append: boolean) => {
      if (lockRef.current) return
      lockRef.current = true
      if (append) setIsLoadingMore(true)
      try {
        const res = await fetchPreOrders(token ?? undefined, page)
        const pagination = res.pre_orders
        if (append) {
          setPreOrders((prev) => {
            const seen = new Set(prev.map((l) => l.id))
            const fresh = (pagination.data ?? []).filter((l) => !seen.has(l.id))
            return [...prev, ...fresh]
          })
        } else {
          setPreOrders(pagination.data ?? [])
        }
        setCurrentPage(page)
        setLastPage(pagination.last_page ?? page)
      } catch {
        // silent
      } finally {
        lockRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [token],
  )

  const switchTab = (tab: OrdersTab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setLineOrders([])
    setPreOrders([])
    setCurrentPage(1)
    setLastPage(2)
    setNoMoreData(false)
    setIsLoading(true)
    lockRef.current = false
  }

  useEffect(() => {
    if (!isLoggedIn) return
    setIsLoading(true)
    lockRef.current = false
    if (activeTab === 'orders') void loadOrders(1, false)
    else if (activeTab === 'shipped') void loadShipped(1, false)
    else void loadPreOrders(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, activeTab])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading && !isLoadingMore && !noMoreData && currentPage < lastPage) {
          const nextPage = currentPage + 1
          if (activeTab === 'orders') void loadOrders(nextPage, true)
          else if (activeTab === 'shipped') void loadShipped(nextPage, true)
          else void loadPreOrders(nextPage, true)
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [currentPage, lastPage, isLoading, isLoadingMore, noMoreData, activeTab, loadOrders, loadShipped, loadPreOrders])

  const tabs: { key: OrdersTab; labelKey: string; labelFallback: string }[] = [
    { key: 'orders', labelKey: 'orders', labelFallback: 'Orders' },
    { key: 'shipped', labelKey: 'shipped', labelFallback: 'Shipped' },
    { key: 'pre_orders', labelKey: 'pre_orders', labelFallback: 'Pre-orders' },
  ]

  const items = activeTab === 'pre_orders' ? preOrders : lineOrders

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="flex w-full items-center gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className="pb-2 text-sm font-bold text-ink transition hover:text-primary"
            >
              {t(tab.labelKey, { defaultValue: tab.labelFallback })}
              {activeTab === tab.key && <span className="mx-auto mt-1 block h-1 w-3/5 rounded-full bg-black" />}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-[200px]">
          {items.length > 0 ? (
            items.map((line) =>
              activeTab === 'pre_orders' ? (
                <PreOrderCard key={line.id} line={line} />
              ) : (
                <AdminOrderCard key={line.id} line={line} />
              ),
            )
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
            ) : noMoreData && items.length > 0 ? (
              <span className="text-[11px] font-medium text-ink-soft">
                {t('no_more_data', { defaultValue: 'No more data' })}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {!isLoggedIn && <LoginPanel />}
    </div>
  )
}

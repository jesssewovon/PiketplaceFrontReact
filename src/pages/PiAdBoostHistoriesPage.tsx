import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Eye, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AdsBalanceItem } from '../types'
import { fetchAdsHistories } from '../lib/api'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

export default function PiAdBoostHistoriesPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)

  const [balances, setBalances] = useState<AdsBalanceItem[]>([])
  const [isLoading, setIsLoading] = useState(() => isLoggedIn)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [noMoreData, setNoMoreData] = useState(false)

  const currentPageRef = useRef(1)
  const lastPageRef = useRef(2)
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const loadHistories = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setIsLoadingMore(true)
    try {
      const res = await fetchAdsHistories(token ?? undefined, currentPageRef.current)
      const pagination = res.balances as { data?: AdsBalanceItem[]; last_page?: number } | undefined
      setBalances((prev) => [...prev, ...(pagination?.data ?? [])])
      const lastPage = pagination?.last_page ?? currentPageRef.current
      lastPageRef.current = lastPage
    } catch {
      // keep previously loaded balances on failure
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
      loadingRef.current = false
    }
  }, [token])

  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoading(false)
      return
    }
    setBalances([])
    currentPageRef.current = 1
    lastPageRef.current = 2
    setNoMoreData(false)
    setIsLoading(true)
    void loadHistories()
  }, [isLoggedIn, loadHistories])

  useEffect(() => {
    if (!isLoggedIn) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        if (currentPageRef.current >= lastPageRef.current) {
          setIsLoadingMore(false)
          setNoMoreData(true)
          return
        }
        currentPageRef.current += 1
        void loadHistories()
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [isLoggedIn, loadHistories])

  if (isLoading) {
    return (
      <section className="px-4 pb-6 pt-3">
        <div className="flex flex-col items-center gap-2 py-16 text-xs text-ink-soft">
          <img src="/site_images/index_loader.gif" alt="" className="w-[70px] rounded-sm" />
          {t('loading', { defaultValue: 'loading' })}
        </div>
      </section>
    )
  }

  if (!isLoggedIn) {
    return (
      <section className="relative min-h-[60vh]">
        <LoginPanel />
      </section>
    )
  }

  return (
    <section className="px-4 pb-6 pt-3">
      {balances.length > 0 ? (
        <div className="mt-2 min-h-[500px]">
          <h5 className="mb-3 text-sm font-black text-ink">{t('history', { defaultValue: 'History' })}</h5>
          {balances.map((item, i) => (
            <div
              key={item.id ?? i}
              className="mb-2.5 flex items-center rounded-xl bg-white p-3.5 shadow-soft"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${
                  item.paid ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {item.paid ? <Check size={18} /> : <Minus size={18} />}
              </span>
              <div className="ml-3.5 min-w-0 flex-1">
                <div className="text-base font-bold text-ink">{item.amount != null ? item.amount : '-'}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {item.number_ads_views}
                  </span>
                  <span className="h-0.5 w-0.5 rounded-full bg-gray-300" />
                  <span>
                    {t(item.month ?? '', { defaultValue: item.month ?? '' })} {item.period?.split('-')[0] ?? ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={sentinelRef}>
            {isLoadingMore && (
              <img
                src="/site_images/ae51e1395e87cc72c6021df5445cc5f8.gif"
                alt=""
                className="mx-auto my-2 rounded-sm"
              />
            )}
            {noMoreData && (
              <div className="my-2.5 rounded-xl bg-gray-200 p-2.5 text-center text-xs text-white">
                {t('no_more_data', { defaultValue: 'No more data' })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center">
          <span>No data available</span>
        </div>
      )}
    </section>
  )
}

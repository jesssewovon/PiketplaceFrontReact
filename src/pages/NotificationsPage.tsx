import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import type { AppNotification } from '../types'
import { fetchNotifications } from '../lib/api'
import { formatAmount, formatDateTime } from '../lib/format'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

export default function NotificationsPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)
  const maintenanceMode = useAppSelector(
    (state) => state.settings.settings?.maintenance_mode === true,
  )
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [noMoreData, setNoMoreData] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const pageRef = useRef(1)
  const lastPageRef = useRef(2)
  const loadingRef = useRef(false)

  const loadNotifications = useCallback(
    async (targetPage: number) => {
      if (loadingRef.current) return
      loadingRef.current = true
      if (targetPage === 1) {
        setIsLoading(true)
        setNoMoreData(false)
      }
      setIsLoadingMore(true)
      try {
        const res = await fetchNotifications(token ?? undefined, user?.id ?? 0, targetPage)
        const pagination = res.notifications
        const list = pagination?.data ?? []
        setNotifications((prev) => (targetPage === 1 ? list : [...prev, ...list]))
        lastPageRef.current = pagination?.last_page ?? 2
        pageRef.current = targetPage
      } catch {
        if (targetPage === 1) setNotifications([])
      } finally {
        loadingRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [token, user?.id],
  )

  const reloadPage = useCallback(() => {
    pageRef.current = 1
    lastPageRef.current = 2
    setNoMoreData(false)
    setNotifications([])
    void loadNotifications(1)
  }, [loadNotifications])

  useEffect(() => {
    if (maintenanceMode) {
      navigate('/maintenance')
    }
  }, [maintenanceMode, navigate])

  useEffect(() => {
    if (!isLoggedIn) return
    void loadNotifications(1)
  }, [isLoggedIn, loadNotifications])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (pageRef.current >= lastPageRef.current) {
          setNoMoreData(true)
          return
        }
        void loadNotifications(pageRef.current + 1)
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadNotifications, notifications.length])

  const renderMessage = (notification: AppNotification): ReactNode => {
    const datas = (notification.datas ?? {}) as Record<string, unknown>
    const val = (key: string): string =>
      datas[key] === null || datas[key] === undefined ? '' : String(datas[key])
    const key = notification.message.replace(/^message\./, '')

    const strong = (children: ReactNode) => (
      <strong className="font-semibold">{children}</strong>
    )
    const here = notification.url ? (
      <Link className="text-blue-700" to={notification.url}>
        {t('here', { defaultValue: 'here' })}
      </Link>
    ) : (
      <span>{t('here', { defaultValue: 'here' })}</span>
    )

    const pn = val('product_name')
    const periodLabel = datas.period
      ? t(`time.${String(datas.period)}`, { defaultValue: String(datas.period) })
      : ''

    return (
      <Trans
        i18nKey={key}
        defaults={t('notification.text', { defaultValue: 'Notification' })}
        values={{
          product_name: pn,
          name: user?.username ?? '',
          username: val('username'),
          applicant: val('applicant'),
          seller: val('seller'),
          buyer: val('buyer'),
          deliver: val('deliver'),
          from: val('from'),
          to: val('to'),
          nb_product: val('nb_product'),
          amount: formatAmount(datas.amount as number | undefined),
          fee: formatAmount(datas.fee as number | undefined),
          time: val('time'),
          period: periodLabel,
          amount_piket: formatAmount(datas.amount_piket as number | undefined),
          child: val('child'),
          here: t('here', { defaultValue: 'here' }),
        }}
        components={{
          product_name: strong(pn),
          name: strong(user?.username ?? ''),
          username: strong(val('username')),
          applicant: strong(val('applicant')),
          seller: strong(val('seller')),
          buyer: strong(val('buyer')),
          deliver: strong(val('deliver')),
          from: strong(val('from')),
          to: strong(val('to')),
          nb_product: strong(val('nb_product')),
          amount: strong(formatAmount(datas.amount as number | undefined)),
          fee: strong(formatAmount(datas.fee as number | undefined)),
          time: strong(val('time')),
          period: strong(periodLabel),
          amount_piket: strong(formatAmount(datas.amount_piket as number | undefined)),
          child: strong(val('child')),
          here,
          strong: <strong className="font-semibold" />,
        }}
      />
    )
  }

  if (!isLoggedIn) {
    return <LoginPanel />
  }

  return (
    <div className="animate-fade-in">
      <section className="px-2 py-3">
        <div className="flex justify-center py-1">
          <button
            type="button"
            onClick={() => reloadPage()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-black/5 hover:text-primary"
            aria-label={t('notifications_refresh', { defaultValue: 'Refresh' })}
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {notifications.length > 0 && (
          <div className="min-h-[500px] rounded-2xl border border-black/5 bg-white p-3 shadow-soft">
            <div>
              {notifications.map((notification, index) => (
                <div
                  key={notification.id ?? index}
                  className="border-b border-slate-100 py-3.5 text-left leading-[15px]"
                >
                  <div>
                    {notification.is_new === 1 && (
                      <span className="mr-1 inline-block rounded-[10px] bg-gradient-to-r from-primary to-primary-deep px-3 py-1 text-[11px] font-semibold not-italic text-white">
                        {t('new', { defaultValue: 'New' })}
                      </span>
                    )}
                    {renderMessage(notification)}
                  </div>
                  <sub className="text-[10px] text-ink-soft">
                    {formatDateTime(notification.created_at)}
                  </sub>
                </div>
              ))}

              <div ref={sentinelRef} />

              {isLoadingMore && (
                <img
                  src="/site_images/ae51e1395e87cc72c6021df5445cc5f8.gif"
                  alt=""
                  className="mx-auto rounded-sm"
                />
              )}
              {noMoreData && (
                <div className="my-2.5 rounded-xl bg-slate-100 p-2.5 text-center text-xs font-medium text-slate-400">
                  {t('no_more_notifications', { defaultValue: 'No more notifications' })}
                </div>
              )}
            </div>
          </div>
        )}

        {notifications.length === 0 && !isLoading && (
          <div className="mt-3 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-center text-[13px] font-semibold text-white">
            {t('no_notifications', { defaultValue: 'No notifications' })}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center gap-2 py-12 text-xs text-ink-soft">
            <img src="/site_images/index_loader.gif" alt="" className="w-[70px] rounded-sm" />
            {t('loading', { defaultValue: 'loading' })}
          </div>
        )}
      </section>
    </div>
  )
}

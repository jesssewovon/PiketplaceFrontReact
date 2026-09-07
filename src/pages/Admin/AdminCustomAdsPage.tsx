import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CustomAd, CancellationReason } from '../../types'
import { approveCustomAd, fetchAdminCustomAds, rejectCustomAd } from '../../lib/api'
import { formatDate, getPeriodLabel, normalizeCancellationReasons } from '../../lib/format'
import { useAppSelector } from '../../store/hooks'
import LoginPanel from '../../components/LoginPanel'
import CancellationReasonsModal from '../../components/CancellationReasonsModal'
import LazyImage from '../../components/LazyImage'

type AdStatus = '' | 'pending' | 'validated' | 'rejected'

const STATUS_OPTIONS: { value: AdStatus; labelKey: string; labelFallback: string }[] = [
  { value: 'pending', labelKey: 'admin.pending', labelFallback: 'En attente' },
  { value: 'validated', labelKey: 'admin.validated', labelFallback: 'Validé' },
  { value: 'rejected', labelKey: 'admin.rejected', labelFallback: 'Rejeté' },
  { value: '', labelKey: 'admin.all', labelFallback: 'Tout' },
]

function StatusTag({ status, paidAt }: { status?: string; paidAt?: string | null }) {
  const { t } = useTranslation()
  if (status === 'validated') {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
        {t('custom_ads.validated', { defaultValue: 'Validated' })}
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
        {t('custom_ads.rejected', { defaultValue: 'Rejected' })}
      </span>
    )
  }
  if (paidAt === null || paidAt === undefined) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
        {t('custom_ads.unpaid', { defaultValue: 'Unpaid' })}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700">
      {t('custom_ads.pending', { defaultValue: 'Pending' })}
    </span>
  )
}

export default function AdminCustomAdsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)

  const [ads, setAds] = useState<CustomAd[]>([])
  const [status, setStatus] = useState<AdStatus>('pending')
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(2)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [noMoreData, setNoMoreData] = useState(false)
  const [reasons, setReasons] = useState<CancellationReason[]>([])
  const [reasonsOpen, setReasonsOpen] = useState(false)
  const [pendingAd, setPendingAd] = useState<CustomAd | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)

  const loadData = useCallback(
    async (page: number, append: boolean) => {
      if (!isLoggedIn || lockRef.current) return
      lockRef.current = true
      if (append) setIsLoadingMore(true)
      try {
        const res = await fetchAdminCustomAds(token ?? undefined, {
          page,
          status,
          locale: i18n.language,
        })
        const pagination = res.ads ?? { current_page: page, data: [] }
        setReasons(normalizeCancellationReasons(res.reasons, i18n.language))
        if (append) {
          setAds((prev) => {
            const seen = new Set(prev.map((a) => a.id))
            const fresh = (pagination.data ?? []).filter((a) => !seen.has(a.id))
            return [...prev, ...fresh]
          })
        } else {
          setAds(pagination.data ?? [])
        }
        setCurrentPage(page)
        setLastPage(pagination.last_page ?? page)
        setNoMoreData(pagination.next_page_url == null)
      } catch {
        // silent
      } finally {
        lockRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [isLoggedIn, token, status, i18n.language],
  )

  useEffect(() => {
    if (!isLoggedIn) return
    setAds([])
    setCurrentPage(1)
    setLastPage(2)
    setNoMoreData(false)
    setIsLoading(true)
    void loadData(1, false)
  }, [isLoggedIn, status, loadData])

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

  const openAdUrl = (ad: CustomAd) => {
    if (!ad.url) return
    if (ad.url.startsWith('/')) {
      navigate(ad.url)
      return
    }
    window.open(ad.url, '_blank', 'noopener,noreferrer')
  }

  const handleApprove = (ad: CustomAd) => {
    void Swal.fire({
      icon: 'warning',
      title: t('confirmation.you_sure', { defaultValue: 'Are you sure?' }),
      showCancelButton: true,
      confirmButtonText: t('validate', { defaultValue: 'Validate' }),
      cancelButtonText: t('no', { defaultValue: 'No' }),
      confirmButtonColor: '#ec11b5',
    }).then((result) => {
      if (result.isConfirmed) void performApprove(ad)
    })
  }

  const performApprove = async (ad: CustomAd) => {
    setProcessingId(ad.id)
    try {
      const res = await approveCustomAd(token ?? undefined, ad.id)
      if (res.status === true) {
        setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, status: 'validated' } : a)))
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
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = (ad: CustomAd) => {
    setPendingAd(ad)
    setReasonsOpen(true)
  }

  const submitReasons = (selected: CancellationReason[], extraText?: string) => {
    if (!pendingAd) return
    const codes = selected.map((r) => r.code)
    if (codes.length === 0) return
    setProcessingId(pendingAd.id)
    void rejectCustomAd(token ?? undefined, pendingAd.id, codes, extraText)
      .then((res) => {
        if (res.status === true) {
          setAds((prev) =>
            prev.map((a) => (a.id === pendingAd.id ? { ...a, status: 'rejected' } : a)),
          )
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
      })
      .catch(() => {
        void Swal.fire({
          icon: 'error',
          title: 'Info',
          text: t('an_error_occured', { defaultValue: 'An error occurred' }),
          confirmButtonColor: '#ec11b5',
        })
      })
      .finally(() => setProcessingId(null))
  }

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <h1 className="text-lg font-bold text-primary-dark">
          {t('admin.custom_ads', { defaultValue: 'Custom ads' })}
        </h1>

        <div className="mt-3 flex flex-wrap gap-2">
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

        <div className="mt-4 min-h-[200px]">
          {ads.length > 0 ? (
            ads.map((ad) => (
              <div
                key={ad.id}
                className="mb-3 flex gap-3 overflow-hidden rounded-2xl border border-black/5 bg-white p-3 shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => openAdUrl(ad)}
                  className="shrink-0"
                  disabled={!ad.url}
                >
                  <LazyImage src={ad.image} alt={ad.name} className="h-20 w-20 rounded-xl" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{ad.name}</p>
                    <StatusTag status={ad.status} paidAt={ad.paid_at} />
                  </div>
                  {ad.user?.username && (
                    <p className="mt-0.5 truncate text-[11px] text-ink-soft">@{ad.user.username}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    {ad.period ? getPeriodLabel(ad.period, t) : '-'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    {t('custom_ads.country', { defaultValue: 'Country' })}: {ad.country_code ?? '-'}
                  </p>
                  {ad.created_at && (
                    <p className="mt-0.5 text-[10px] text-ink-soft">{formatDate(ad.created_at)}</p>
                  )}
                  {ad.status === 'pending' && ad.paid_at !== null && (
                    <div className="mt-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleApprove(ad)}
                        disabled={processingId === ad.id}
                        className="flex flex-1 items-center justify-center rounded-lg bg-green-500 px-2 py-1 text-[10px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingId === ad.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          t('validate', { defaultValue: 'Validate' })
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(ad)}
                        disabled={processingId === ad.id}
                        className="flex flex-1 items-center justify-center rounded-lg bg-red-500 px-2 py-1 text-[10px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingId === ad.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          t('reject', { defaultValue: 'Reject' })
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
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
            ) : noMoreData && ads.length > 0 ? (
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
        reasons={reasons}
        extraInputLabel={t('custom_ads.extra_reason', {
          defaultValue: 'Extra reason (optional)',
        })}
        onClose={() => {
          setReasonsOpen(false)
          setPendingAd(null)
        }}
        onSubmit={submitReasons}
      />
    </div>
  )
}
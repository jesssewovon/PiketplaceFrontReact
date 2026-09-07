import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Clock, Loader2, Megaphone, Pencil, Plus, Trash2, Wallet, X, XCircle } from 'lucide-react'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'
import type { CustomAd, CancellationReason } from '../types'
import {
  fetchMyCustomAds,
  deleteCustomAd,
  payCustomAdPiketplaceWallet,
  postPiPayment,
} from '../lib/api'
import { createPiPayment, initPi, waitForPi } from '../lib/pi'
import { formatDate, normalizeCancellationReasons } from '../lib/format'
import { showAlert } from '../lib/alert'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'
import LazyImage from '../components/LazyImage'
import PiPaymentLoader from '../components/PiPaymentLoader'

function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation()
  if (status === 'validated') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700">
        <BadgeCheck size={12} />
        {t('custom_ads.validated', { defaultValue: 'Validated' })}
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-600">
        <XCircle size={12} />
        {t('custom_ads.rejected', { defaultValue: 'Rejected' })}
      </span>
    )
  }
  if (status === 'unpaid') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-500">
        <Clock size={12} />
        {t('custom_ads.unpaid', { defaultValue: 'Unpaid' })}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-[10px] font-bold text-yellow-700">
      <Clock size={12} />
      {t('custom_ads.pending', { defaultValue: 'Pending' })}
    </span>
  )
}

export default function MyAdsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)
  const settings = useAppSelector((state) => state.settings.settings)

  const walletUrl =
    typeof settings?.piket_wallet_frontend_url === 'string'
      ? (settings.piket_wallet_frontend_url as string)
      : null

  const [ads, setAds] = useState<CustomAd[]>([])
  const [canCreate, setCanCreate] = useState(true)
  const [reasonsByLocale, setReasonsByLocale] = useState<Record<string, CancellationReason[]>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(2)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [noMoreData, setNoMoreData] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)

  const [walletAd, setWalletAd] = useState<CustomAd | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [piLoaderOpen, setPiLoaderOpen] = useState(false)
  const uniqueIdRef = useRef('')

  const rejectionText = (codes?: string[] | null): string => {
    const list = normalizeCancellationReasons(reasonsByLocale, i18n.language)
    return (codes ?? []).map((code) => list.find((r) => r.code === code)?.text ?? code).join(', ')
  }

  const rejectionReasons = (ad: CustomAd): string[] => {
    const rejection = ad.approbations?.find((a) => a.status === 'rejected')
    return rejection?.reasons ?? []
  }

  const rejectionCustomReason = (ad: CustomAd): string | undefined => {
    const rejection = ad.approbations?.find((a) => a.status === 'rejected')
    return rejection?.custom_reason ?? undefined
  }

  const loadData = useCallback(
    async (page: number, append: boolean) => {
      if (!isLoggedIn || lockRef.current) return
      lockRef.current = true
      if (append) setIsLoadingMore(true)
      try {
        const res = await fetchMyCustomAds(token ?? undefined, page)
        const pagination = res.ads ?? { current_page: page, data: [] }
        if (res.reasons) setReasonsByLocale(res.reasons as Record<string, CancellationReason[]>)
        if (typeof res.can_create === 'boolean') setCanCreate(res.can_create)
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
    [isLoggedIn, token],
  )

  useEffect(() => {
    if (!isLoggedIn) return
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

  const askPinAndPayPiketplaceWallet = async (ad: CustomAd) => {
    setWalletAd(null)
    const result = await Swal.fire({
      title: t('info', { defaultValue: 'Info' }),
      html: `<span class="font-900 font-16">${t('put_your_code_pin', {
        defaultValue: 'Put your code PIN',
      })}</span><br><br>${t('create_your_code_pin', {
        defaultValue: 'Create your code PIN on',
      })}<i class="fa fa-hand-point-right me-1 ms-1"></i><a style="color: darkblue" href="${
        walletUrl ?? '#'
      }" target="_blank">Piket Wallet</a><br><br>`,
      input: 'password',
      showCancelButton: true,
      confirmButtonText: t('confirmation.yes_continue', { defaultValue: 'Yes, continue!' }),
      cancelButtonText: t('confirmation.no_cancel', { defaultValue: 'No, cancel' }),
      confirmButtonColor: '#ec11b5',
    })
    if (!result.isConfirmed || !result.value) return
    await payWithPiketplaceWallet(ad, String(result.value))
  }

  const payWithPiketplaceWallet = async (ad: CustomAd, codePin: string) => {
    setIsPaying(true)
    try {
      const res = await payCustomAdPiketplaceWallet(token ?? undefined, user?.uid, {
        code_pin: codePin,
        custom_ad_id: ad.id,
      })
      setIsPaying(false)
      if (res.status === true) {
        void showAlert(
          t('custom_ads.paid', { defaultValue: 'Paid' }),
          t('custom_ads.paid_text', {
            defaultValue: 'Your ad has been paid and sent for review.',
          }),
          'success',
        )
        void loadData(currentPage, false)
      } else {
        void showAlert(
          t('error', { defaultValue: 'Error' }),
          res.message ?? t('an_error_occured', { defaultValue: 'An error occurred' }),
          'error',
        )
      }
    } catch (err) {
      setIsPaying(false)
      const message =
        err instanceof Error ? err.message : t('an_error_occured', { defaultValue: 'An error occurred' })
      void showAlert(t('error', { defaultValue: 'Error' }), message, 'error')
    }
  }

  const payWithPiNetworkWallet = async (ad: CustomAd) => {
    if (!ad.period || Number(ad.period.amount ?? 0) <= 0) return
    setWalletAd(null)
    setConfirming(true)
    const uniqueId = crypto.randomUUID()
    uniqueIdRef.current = uniqueId
    const memo = t('custom_ads.pi_pay_memo', {
      defaultValue: 'Custom ad submission on Piketplace',
      amount: Number(ad.period.amount),
    })
    const callbacks = {
      onReadyForServerApproval: (paymentId: string) =>
        postPiPayment(token ?? undefined, user?.uid, 'approve', { paymentId }),
      onReadyForServerCompletion: (paymentId: string, txid: string) =>
        postPiPayment(token ?? undefined, user?.uid, 'complete', { paymentId, txid }),
      onCancel: () => undefined,
      onError: () => undefined,
    }
    try {
      await waitForPi()
      initPi()
      if (!window.Pi) throw new Error('Pi SDK is not available')
      const onIncompletePaymentFound = (payment: unknown) => {
        const p = payment as { identifier?: string; transaction?: { txid?: string } }
        if (!p.identifier || !p.transaction?.txid) return
        void postPiPayment(token ?? undefined, user?.uid, 'incomplete', {
          paymentId: p.identifier,
          txid: p.transaction.txid,
        }).catch(() => undefined)
      }
      await window.Pi.authenticate(['username', 'payments'], onIncompletePaymentFound).catch(
        () => undefined,
      )
      createPiPayment(
        {
          amount: Number(ad.period.amount),
          memo,
          metadata: {
            uniqueId,
            type: 'custom_ad',
            userId: user?.id,
            custom_ad_id: ad.id,
            is_piket: 'false',
          },
        },
        callbacks,
      )
      setPiLoaderOpen(true)
      setConfirming(false)
    } catch {
      setConfirming(false)
      void showAlert(
        t('error', { defaultValue: 'Error' }),
        t('please_use_pi_browser', { defaultValue: 'Please use the Pi browser' }),
        'error',
      )
    }
  }

  const handlePiVerified = () => {
    setPiLoaderOpen(false)
    uniqueIdRef.current = ''
    void loadData(currentPage, false)
  }

  const handlePiLoaderClose = () => {
    setPiLoaderOpen(false)
    uniqueIdRef.current = ''
  }

  const confirmDelete = async (ad: CustomAd) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: t('custom_ads.delete_title', { defaultValue: 'Delete this ad?' }),
      text: t('custom_ads.delete_text', {
        defaultValue: 'This action cannot be undone.',
      }),
      showCancelButton: true,
      confirmButtonText: t('confirmation.yes_delete', { defaultValue: 'Yes, delete' }),
      cancelButtonText: t('confirmation.no_cancel', { defaultValue: 'No, cancel' }),
      confirmButtonColor: '#e02424',
    })
    if (!result.isConfirmed) return
    try {
      const res = await deleteCustomAd(token ?? undefined, ad.id)
      if (res.status === true) {
        void showAlert(
          t('custom_ads.deleted', { defaultValue: 'Deleted' }),
          res.message ?? t('custom_ads.deleted_text', { defaultValue: 'Your ad has been deleted.' }),
          'success',
        )
        void loadData(currentPage, false)
      } else {
        void showAlert(
          t('error', { defaultValue: 'Error' }),
          res.message ?? t('an_error_occured', { defaultValue: 'An error occurred' }),
          'error',
        )
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('an_error_occured', { defaultValue: 'An error occurred' })
      void showAlert(t('error', { defaultValue: 'Error' }), message, 'error')
    }
  }

  if (!isLoggedIn) return <LoginPanel />

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary-dark">
            {t('custom_ads.my_ads_title', { defaultValue: 'My ads' })}
          </h1>
          <button
            type="button"
            onClick={() => navigate('/submit-ad')}
            disabled={!canCreate}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} />
            {t('custom_ads.submit_button', { defaultValue: 'Submit ad' })}
          </button>
        </div>

        {!canCreate && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
            {t('custom_ads.create_blocked', {
              defaultValue:
                'You can only create a new ad when your latest ad is paid and approved. Pay, wait for the review, or delete your unpaid ad first.',
            })}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {ads.length > 0 ? (
            ads.map((ad) => {
              const reasons = rejectionReasons(ad)
              const customReason = rejectionCustomReason(ad)
              const rejected = ad.status === 'rejected' && (reasons.length > 0 || !!customReason)
              const showActions = ad.status === 'unpaid' || ad.status === 'rejected'
              return (
                <div
                  key={ad.id}
                  className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-soft"
                >
                  <div className="flex gap-3 p-3">
                    <LazyImage
                      src={ad.image}
                      alt={ad.name}
                      className="h-16 w-16 shrink-0 rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{ad.name}</p>
                        <StatusBadge status={ad.status} />
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-soft">
                        <Megaphone size={12} />
                        {ad.period
                          ? `${ad.period.type ?? ''}${ad.period.period ? ' - ' + ad.period.period : ''}`
                          : '-'}
                      </p>
                      {ad.country_code && (
                        <p className="mt-0.5 text-[11px] text-ink-soft">
                          {t('custom_ads.country', { defaultValue: 'Country' })}: {ad.country_code}
                        </p>
                      )}
                      {ad.created_at && (
                        <p className="mt-0.5 text-[10px] text-ink-soft">
                          {formatDate(ad.created_at)}
                        </p>
                      )}
                      {showActions && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {ad.status === 'unpaid' && (
                            <button
                              type="button"
                              onClick={() => setWalletAd(ad)}
                              className="flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary-deep px-3 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90"
                            >
                              <Wallet size={12} />
                              {ad.period && Number(ad.period.amount ?? 0) > 0
                                ? `${t('custom_ads.pay', { defaultValue: 'Pay' })} (π ${ad.period.amount})`
                                : t('custom_ads.pay', { defaultValue: 'Pay' })}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate(`/submit-ad/${ad.id}`)}
                            className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-ink-soft transition hover:bg-slate-200"
                          >
                            <Pencil size={12} />
                            {ad.status === 'rejected'
                              ? t('custom_ads.edit_resubmit', { defaultValue: 'Edit & resubmit' })
                              : t('custom_ads.edit', { defaultValue: 'Edit' })}
                          </button>
                          {ad.status === 'unpaid' && (
                            <button
                              type="button"
                              onClick={() => void confirmDelete(ad)}
                              className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-500 transition hover:bg-red-100"
                            >
                              <Trash2 size={12} />
                              {t('custom_ads.delete', { defaultValue: 'Delete' })}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {rejected && (
                    <div className="border-t border-red-100 bg-red-50 px-3 py-2">
                      <p className="text-[11px] font-semibold text-red-600">
                        {t('custom_ads.rejection_reason', { defaultValue: 'Rejection reason' })}:{' '}
                        <span className="font-medium">{rejectionText(reasons)}</span>
                      </p>
                      {customReason && (
                        <p className="mt-1 text-[11px] font-medium text-red-600">
                          {t('custom_ads.extra_reason', { defaultValue: 'Extra reason' })}:{' '}
                          <span className="font-medium">{customReason}</span>
                        </p>
                      )}
                    </div>
                  )}
                  {ad.status === 'rejected' && !rejected && (
                    <div className="border-t border-red-100 bg-red-50 px-3 py-2">
                      <p className="text-[11px] font-medium text-red-600">
                        {t('custom_ads.rejected_resubmit_hint', {
                          defaultValue:
                            'Edit your ad to fix the issues above, then resubmit it for a new review.',
                        })}
                      </p>
                    </div>
                  )}
                  {ad.status === 'pending' && (
                    <div className="border-t border-yellow-100 bg-yellow-50 px-3 py-2">
                      <p className="text-[11px] font-medium text-yellow-700">
                        {t('custom_ads.pending_hint', {
                          defaultValue:
                            'Your ad has been paid and is awaiting validation by an administrator.',
                        })}
                      </p>
                    </div>
                  )}
                  {ad.status === 'validated' && ad.expires_at && (
                    <div className="border-t border-green-100 bg-green-50 px-3 py-2">
                      <p className="text-[11px] font-medium text-green-700">
                        {t('custom_ads.validated_hint', {
                          defaultValue: 'Your ad is running until',
                        })}{' '}
                        {formatDate(ad.expires_at)}
                      </p>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            !isLoading && (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <Megaphone size={36} className="text-slate-300" />
                <p className="text-sm font-medium text-ink-soft">
                  {t('custom_ads.no_ads', { defaultValue: 'You have not submitted any ad yet.' })}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/submit-ad')}
                  className="mt-1 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
                >
                  {t('custom_ads.submit_button', { defaultValue: 'Submit ad' })}
                </button>
              </div>
            )
          )}
        </div>

        <div ref={sentinelRef} className="flex justify-center py-6">
          {isLoading || isLoadingMore ? (
            <Loader2 size={20} className="animate-spin text-primary" />
          ) : noMoreData && ads.length > 0 ? (
            <span className="text-[11px] font-medium text-ink-soft">
              {t('no_more_data', { defaultValue: 'No more data' })}
            </span>
          ) : null}
        </div>
      </section>

      {walletAd && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setWalletAd(null)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">
                {t('pay_with', { defaultValue: 'Pay with' })}
                {walletAd.period && Number(walletAd.period.amount ?? 0) > 0 && (
                  <span className="ml-1 text-primary">(π {walletAd.period.amount})</span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setWalletAd(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => void askPinAndPayPiketplaceWallet(walletAd)}
                className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3.5 text-left text-sm font-bold text-white shadow-soft transition hover:opacity-90"
              >
                <Wallet size={18} />
                {t('piketplace_wallet', { defaultValue: 'Piketplace Wallet' })}
              </button>
              <button
                type="button"
                onClick={() => void payWithPiNetworkWallet(walletAd)}
                className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-[#fbb148] to-[#f5a72b] px-4 py-3.5 text-left text-sm font-bold text-white shadow-soft transition hover:opacity-90"
              >
                <img src="/site_images/pi.png" alt="π" className="h-5 w-5 rounded-full object-cover" />
                {t('pinetwork_wallet', { defaultValue: 'Pi Network wallet' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {(isPaying || confirming) && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <Loader2 size={32} className="animate-spin text-white" />
        </div>
      )}

      <PiPaymentLoader
        open={piLoaderOpen}
        token={token}
        uniqueId={uniqueIdRef.current}
        userId={user?.id}
        successMessageKey="cart.payment_done"
        onClose={handlePiLoaderClose}
        onVerified={handlePiVerified}
      />
    </div>
  )
}
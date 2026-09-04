import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Loader2, Search, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CancellationReason, WithdrawalRequest } from '../../types'
import { fetchAdminWithdrawals, confirmWithdrawal, cancelWithdrawalConfirmation, rejectWithdrawal } from '../../lib/api'
import { formatDate, normalizeCancellationReasons } from '../../lib/format'
import { useAppSelector } from '../../store/hooks'
import LoginPanel from '../../components/LoginPanel'
import CancellationReasonsModal from '../../components/CancellationReasonsModal'

type WithdrawalStatus = 'pending' | 'confirmed'

export default function AdminWithdrawalsPage() {
  const { t, i18n } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [status, setStatus] = useState<WithdrawalStatus>('pending')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(2)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [noMoreData, setNoMoreData] = useState(false)
  const [reasonsOpen, setReasonsOpen] = useState(false)
  const [withdrawalReasons, setWithdrawalReasons] = useState<CancellationReason[]>([])
  const [selectedWithdraw, setSelectedWithdraw] = useState<WithdrawalRequest | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)

  const loadData = useCallback(
    async (page: number, append: boolean) => {
      if (lockRef.current) return
      lockRef.current = true
      if (append) setIsLoadingMore(true)
      try {
        const res = await fetchAdminWithdrawals(token ?? undefined, { page, search, status })
        const pagination = res.withdrawal_requests ?? { current_page: page, data: [] }
        if (append) {
          setWithdrawals((prev) => {
            const seen = new Set(prev.map((w) => w.id))
            const fresh = (pagination.data ?? []).filter((w) => !seen.has(w.id))
            return [...prev, ...fresh]
          })
        } else {
          setWithdrawals(pagination.data ?? [])
        }
        setCurrentPage(page)
        setLastPage(pagination.last_page ?? page)
        if (res.withdrawal_reasons) {
          setWithdrawalReasons(normalizeCancellationReasons(res.withdrawal_reasons, i18n.language))
        }
      } catch {
        // silent
      } finally {
        lockRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [token, search, status, i18n.language],
  )

  useEffect(() => {
    if (!isLoggedIn) return
    setWithdrawals([])
    setCurrentPage(1)
    setLastPage(2)
    setNoMoreData(false)
    setIsLoading(true)
    lockRef.current = false
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

  const handleConfirm = async (withdraw: WithdrawalRequest, type?: 'cancel') => {
    const result = await Swal.fire({
      icon: 'warning',
      title: t('confirmation.you_sure', { defaultValue: 'Are you sure?' }),
      showCancelButton: true,
      confirmButtonText: t('yes', { defaultValue: 'Yes' }),
      cancelButtonText: t('no', { defaultValue: 'No' }),
      confirmButtonColor: '#ec11b5',
    })
    if (!result.isConfirmed) return
    try {
      const res = type === 'cancel'
        ? await cancelWithdrawalConfirmation(token ?? undefined, withdraw.id)
        : await confirmWithdrawal(token ?? undefined, withdraw.id)
      if (res.status === true) {
        setWithdrawals((prev) => prev.filter((w) => w.id !== withdraw.id))
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
          text: t('an_error_occured', { defaultValue: 'An error occurred' }),
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

  const openRejection = (withdraw: WithdrawalRequest) => {
    setSelectedWithdraw(withdraw)
    setReasonsOpen(true)
  }

  const submitRejectionReasons = async (reasons: CancellationReason[]) => {
    if (!selectedWithdraw) return
    const selected = reasons.filter((r) => r.selected).map((r) => r.code)
    if (selected.length === 0) return
    try {
      const res = await rejectWithdrawal(token ?? undefined, selectedWithdraw.id, selected)
      if (res.status === true) {
        setWithdrawals((prev) => prev.filter((w) => w.id !== selectedWithdraw.id))
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
          text: t('an_error_occured', { defaultValue: 'An error occurred' }),
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
      setSelectedWithdraw(null)
    }
  }

  const currency = useAppSelector((state) =>
    typeof state.settings.settings?.currency === 'string'
      ? (state.settings.settings.currency as string)
      : 'π'
  )

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <input
              type="radio"
              name="wstatus"
              value="pending"
              checked={status === 'pending'}
              onChange={() => setStatus('pending')}
              className="accent-[#ec11b5]"
            />
            {t('pending', { defaultValue: 'Pending' })}
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <input
              type="radio"
              name="wstatus"
              value="confirmed"
              checked={status === 'confirmed'}
              onChange={() => setStatus('confirmed')}
              className="accent-[#ec11b5]"
            />
            {t('confirmed', { defaultValue: 'Confirmed' })}
          </label>
        </div>

        <div className="mt-3 flex items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setWithdrawals([])
                setCurrentPage(1)
                setLastPage(2)
                setIsLoading(true)
                lockRef.current = false
                void loadData(1, false)
              }
            }}
            placeholder={t('search', { defaultValue: 'Search' })}
            className="h-[30px] w-full rounded-full border border-primary bg-gray-200 px-4 text-sm text-ink outline-none transition focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => {
              setWithdrawals([])
              setCurrentPage(1)
              setLastPage(2)
              setIsLoading(true)
              lockRef.current = false
              void loadData(1, false)
            }}
            className="-ml-9 flex h-[30px] items-center justify-center rounded-full bg-black px-3 text-white transition hover:opacity-90"
          >
            <Search size={16} />
          </button>
        </div>

        <div className="mt-4 min-h-[200px]">
          {withdrawals.length > 0 ? (
            withdrawals.map((withdraw) => (
              <div key={withdraw.id} className="mb-3 rounded-2xl border border-black/5 bg-white p-3 shadow-soft">
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-bold text-ink">
                    {formatDate(withdraw.created_at)}
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    {withdraw.real_amount} {currency}
                  </span>
                </div>

                <div className="my-1.5 h-px bg-black/5" />

                <p className="text-[11px] text-ink-soft">
                  @{withdraw.wallet?.user?.username ?? ''} • {withdraw.public_key}
                </p>

                {withdraw.confirmed_at ? (
                  <p className="mt-1 text-[10px] text-green-600">
                    {t('confirmed_at', { defaultValue: 'Confirmed', date: formatDate(withdraw.confirmed_at) })}
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-yellow-600">
                    {t('pending', { defaultValue: 'Pending' })}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {withdraw.confirmed_at === null ? (
                    <button
                      type="button"
                      onClick={() => void handleConfirm(withdraw)}
                      className="rounded-lg bg-green-500 px-3 py-1.5 text-[10px] font-bold text-white transition hover:opacity-90"
                    >
                      {t('confirm', { defaultValue: 'Confirm' })}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleConfirm(withdraw, 'cancel')}
                      className="rounded-lg bg-gray-500 px-3 py-1.5 text-[10px] font-bold text-white transition hover:opacity-90"
                    >
                      {t('cancel_confirmation', { defaultValue: 'Annuler confirmation' })}
                    </button>
                  )}
                  {withdraw.confirmed_at === null && (
                    <button
                      type="button"
                      onClick={() => openRejection(withdraw)}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-[10px] font-bold text-white transition hover:opacity-90"
                    >
                      {t('reject', { defaultValue: 'Reject' })}
                    </button>
                  )}
                  <Link
                    to={`/wallet-balance-details/${withdraw.wallet?.user?.username ?? ''}`}
                    className="flex items-center rounded-lg bg-slate-100 px-2 py-1.5 text-ink-soft transition hover:bg-slate-200"
                  >
                    <Info size={14} />
                  </Link>
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
            ) : noMoreData && withdrawals.length > 0 ? (
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
        reasons={withdrawalReasons}
        onClose={() => {
          setReasonsOpen(false)
          setSelectedWithdraw(null)
        }}
        onSubmit={submitRejectionReasons}
      />
    </div>
  )
}

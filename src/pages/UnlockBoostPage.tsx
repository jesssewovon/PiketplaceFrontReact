import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Eye, Loader2, Minus, RotateCcw, Wallet } from 'lucide-react'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'
import type { AdsBalanceItem, AdsData } from '../types'
import { fetchAdsData, fetchAdsHistories, rewardUserAds } from '../lib/api'
import { showRewardedAd } from '../lib/pi'
import { showAlert } from '../lib/alert'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

function pad(value: number): string {
  return value < 10 ? `0${value}` : `${value}`
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((milliseconds % 1000) / 100)
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${tenths}`
}

export default function UnlockBoostPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const walletUrl = useAppSelector((state) =>
    typeof state.settings.settings?.piket_wallet_frontend_url === 'string'
      ? (state.settings.settings.piket_wallet_frontend_url as string)
      : null
  )

  const [adsData, setAdsData] = useState<AdsData | null>(null)
  const [recentBalances, setRecentBalances] = useState<AdsBalanceItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [remainingMs, setRemainingMs] = useState(0)
  const failedAdsRef = useRef<unknown[]>([])

  const loadRecentBalances = useCallback(async () => {
    try {
      const res = await fetchAdsHistories(token ?? undefined, 1)
      setRecentBalances((res.balances?.data ?? []).slice(0, 4))
    } catch {
      // keep previous balances on failure
    }
  }, [token])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetchAdsData(token ?? undefined, failedAdsRef.current)
      failedAdsRef.current = []
      setAdsData(res.ads_data ?? null)
    } catch {
      // keep previous values when the request fails
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!isLoggedIn) return
    void loadData()
    void loadRecentBalances()
  }, [isLoggedIn, loadData, loadRecentBalances])

  useEffect(() => {
    const remainingTime = (adsData?.remaining_time ?? 0) * 1000
    setRemainingMs(remainingTime)
  }, [adsData?.remaining_time])

  useEffect(() => {
    if (remainingMs <= 0) return
    const interval = window.setInterval(() => {
      setRemainingMs((value) => Math.max(0, value - 100))
    }, 100)
    return () => window.clearInterval(interval)
  }, [remainingMs])

  const rewardAd = async (adId: string) => {
    try {
      const res = await rewardUserAds(token ?? undefined, adId, failedAdsRef.current)
      failedAdsRef.current = []
      if (res.ads_data) setAdsData(res.ads_data)
      if (res.status === true) {
        void loadRecentBalances()
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          html: `<br><strong style="font-size:20px;">${t('ad_successfully_rewarded', {
            defaultValue: 'Ad viewed is successfully rewarded',
          })}</strong>`,
          confirmButtonColor: '#ec11b5',
        })
      } else if (res.message) {
        if (res.message.includes('an_error_occured') && res.data) {
          failedAdsRef.current.push({ adid: adId, message: res.data })
        }
        showAlert(t('info', { defaultValue: 'Info' }), t(res.message, { defaultValue: res.message }), 'error')
      }
    } catch {
      showAlert(t('info', { defaultValue: 'Info' }), t('an_error_occured', { defaultValue: 'An error occurred' }), 'error')
    }
  }

  const displayAd = async () => {
    if (adsData !== null && (adsData.remaining_time ?? 0) <= 0) {
      await loadData()
      return
    }
    if (adsData?.limit_reached) {
      showAlert(t('info', { defaultValue: 'Info' }), t('ads_unavailable', { defaultValue: 'Ads unavailable' }), 'error')
      return
    }
    setSaving(true)
    try {
      const showAdResponse = await showRewardedAd()
      const result = showAdResponse.result
      if (result === 'AD_REWARDED' && showAdResponse.adId) {
        await rewardAd(showAdResponse.adId)
      } else if (result === 'AD_FAILED_TO_LOAD') {
        showAlert(t('info', { defaultValue: 'Info' }), t('ad_failed_to_load', { defaultValue: 'Ad failed to load' }), 'error')
      } else if (result === 'AD_NOT_AVAILABLE') {
        showAlert(t('info', { defaultValue: 'Info' }), t('ads_unavailable', { defaultValue: 'Ads unavailable' }), 'error')
      } else if (result === 'AD_NETWORK_ERROR') {
        showAlert(
          t('info', { defaultValue: 'Info' }),
          t('encountered_network_connection_issues', {
            defaultValue: 'We encountered network connection issues',
          }),
          'error',
        )
      } else if (result === 'AD_DISPLAY_ERROR') {
        showAlert(
          t('info', { defaultValue: 'Info' }),
          t('ad_failed_to_be_displayed', { defaultValue: 'Ad failed to be displayed' }),
          'error',
        )
      } else if (result === 'USER_UNAUTHENTICATED') {
        showAlert(
          t('info', { defaultValue: 'Info' }),
          t('not_authenticated_try_again', { defaultValue: 'Not authenticated, try again' }),
          'error',
        )
      } else if (result !== 'ADS_NOT_SUPPORTED' && result !== 'AD_CLOSED') {
        showAlert(t('info', { defaultValue: 'Info' }), t('an_error_occured', { defaultValue: 'An error occurred' }), 'error')
      }
    } catch {
      showAlert(t('info', { defaultValue: 'Info' }), t('an_error_occured', { defaultValue: 'An error occurred' }), 'error')
    } finally {
      setSaving(false)
    }
  }

  const reload = () => {
    void loadData()
    void loadRecentBalances()
  }

  const currentBalance = adsData?.ads_history_data?.current_balance ?? adsData?.current_balance
  const shownBalances = recentBalances.filter(
    (item) => item.period !== currentBalance?.period,
  )

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="flex justify-center py-1">
          <button
            type="button"
            onClick={reload}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-black/5 hover:text-primary"
            aria-label={t('reload', { defaultValue: 'reload' })}
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {isLoggedIn && !isLoading && (
          <>
            <div className="mt-5 rounded-xl bg-gradient-to-br from-primary via-primary-dark to-primary-deep p-5 shadow-soft">
              <div className="text-center">
                {currentBalance?.month && (
                  <i className="text-[11px] font-normal text-white/80">
                    {t(currentBalance.month, { defaultValue: currentBalance.month })}-
                    {currentBalance.period?.split('-')[0] ?? ''}
                  </i>
                )}
                <h1 className="mt-1 text-3xl font-extrabold text-white">
                  {currentBalance?.number_ads_views ?? 0}
                </h1>
              </div>
            </div>

            {remainingMs > 0 && (
              <div className="mt-4 text-center text-xs font-medium text-ink-soft">
                {t('remaining_time', {
                  defaultValue: 'Remaining time :',
                  hours: '',
                  minutes: '',
                  seconds: '',
                })}
                <span className="ml-1 font-bold text-primary">{formatCountdown(remainingMs)}</span>
                <button
                  type="button"
                  onClick={reload}
                  className="ml-2 inline-flex align-middle text-primary"
                  aria-label={t('reload', { defaultValue: 'reload' })}
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => void displayAd()}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-sm font-bold text-white shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {t('unlock', { defaultValue: 'Unlock' })}
              </button>
            </div>

            {shownBalances.length > 0 && (
              <div className="mt-5">
                <h5 className="mb-2 text-xs font-bold text-ink">
                  {t('ads_earnings', { defaultValue: 'Ads earnings' })}
                </h5>
                {shownBalances.map((item, i) => (
                  <div
                    key={item.id ?? i}
                    className="mb-2 flex items-center rounded-xl bg-white p-3.5 shadow-soft"
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${
                        item.paid ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {item.paid ? <Check size={18} /> : <Minus size={18} />}
                    </span>
                    <div className="ml-3.5 min-w-0 flex-1">
                      <div className="text-base font-bold text-ink">
                        {item.amount != null ? item.amount : '-'}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {item.number_ads_views}
                        </span>
                        <span className="h-0.5 w-0.5 rounded-full bg-gray-300" />
                        <span>
                          {t(item.month ?? '', { defaultValue: item.month ?? '' })}-
                          {item.period?.split('-')[0] ?? ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between px-1">
                  {walletUrl ? (
                    <a href={walletUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                      <Wallet size={13} />
                      {t('wallet', { defaultValue: 'Wallet' })}
                    </a>
                  ) : (
                    <span />
                  )}
                  <a href="/pi-ad-boost-histories" className="text-xs font-semibold text-blue-600">
                    {t('history', { defaultValue: 'History' })}
                  </a>
                </div>
              </div>
            )}
          </>
        )}

        {isLoggedIn && isLoading && (
          <div className="flex flex-col items-center gap-2 py-12 text-xs text-ink-soft">
            <Loader2 size={26} className="animate-spin text-primary" />
            {t('loading', { defaultValue: 'loading' })}
          </div>
        )}

        {!isLoggedIn && <LoginPanel />}
      </section>
    </div>
  )
}

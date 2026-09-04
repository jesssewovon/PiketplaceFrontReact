import { useEffect, useState } from 'react'
import { Factory, Loader2, RotateCcw, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { checkMining as fetchCheckMining, startMining as fetchStartMining } from '../lib/api'
import { showAlert } from '../lib/alert'
import { showRewardedAd } from '../lib/pi'
import { useAppSelector } from '../store/hooks'
import { store } from '../store/index'
import LoginPanel from '../components/LoginPanel'

const FULL_MINING_DURATION = 3600 * 24 * 1000

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

function formatRate(rate: number, separator: string): string {
  const [whole, fraction] = rate.toString().split('.')
  return `${whole}${separator}${fraction ?? '0'}`
}

export default function MiningPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const walletUrl = useAppSelector((state) =>
    typeof state.settings.settings?.piket_wallet_frontend_url === 'string'
      ? (state.settings.settings.piket_wallet_frontend_url as string)
      : null
  )
  const [loading, setLoading] = useState(false)
  const [miningRemainingTime, setMiningRemainingTime] = useState(0)
  const [miningRate, setMiningRate] = useState(0)
  const [saving, setSaving] = useState(false)

  const isRunning = miningRemainingTime > 0

  useEffect(() => {
    if (!isRunning) return
    const interval = window.setInterval(() => {
      setMiningRemainingTime((value) => Math.max(0, value - 100))
    }, 100)
    return () => window.clearInterval(interval)
  }, [isRunning])

  const checkMining = async () => {
    setLoading(true)
    try {
      const data = await fetchCheckMining(token ?? undefined)
      if (typeof data.mining_remaining_time === 'number') {
        setMiningRemainingTime(data.mining_remaining_time)
      }
      if (typeof data.wallet_user?.mining_data?.mining_rate === 'number') {
        setMiningRate(data.wallet_user.mining_data.mining_rate)
      }
    } catch {
      // keep previous values when the request fails
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return
    void checkMining()
    if (store.getState().attributes.mining_activation === false) {
      void showAlert(
        t('info', { defaultValue: 'Info' }),
        t('access_denied', { defaultValue: 'Access denied' }),
        'error',
      )
    }
  }, [isLoggedIn])

  const startMining = async () => {
    setSaving(true)
    try {
      const data = await fetchStartMining(token ?? undefined)
      if (data.message === 'session_running') {
        void showAlert(
          t('info', { defaultValue: 'Info' }),
          t('side_menu.mining_session_running', {
            defaultValue: 'Mining session is still running',
          }),
          'error',
        )
      }
      if (typeof data.wallet_user?.mining_data?.mining_rate === 'number') {
        setMiningRate(data.wallet_user.mining_data.mining_rate)
      }
      if (typeof data.mining_remaining_time === 'number') {
        if (data.mining_remaining_time === FULL_MINING_DURATION) {
          setMiningRemainingTime(data.mining_remaining_time - 1)
        } else if (data.mining_remaining_time < FULL_MINING_DURATION) {
          setMiningRemainingTime(data.mining_remaining_time)
        }
      }
      void showRewardedAd().catch(() => {})
    } catch {
      // ignore failed requests
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="flex justify-center py-1">
          <button
            type="button"
            onClick={() => void checkMining()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-black/5 hover:text-primary"
            aria-label={t('mining_refresh', { defaultValue: 'Refresh' })}
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {isLoggedIn && !loading && (
          <div className="mt-5 min-h-[300px] rounded-[8px_8px_30px] bg-gradient-to-br from-primary via-primary-dark to-primary-deep p-8 shadow-soft">
            <div className="text-center">
              <Factory size={48} strokeWidth={1.8} className="mx-auto text-white/90" />
            </div>

            {isRunning ? (
              <>
                <p className="mt-5 text-center text-lg font-semibold leading-snug text-white">
                  {t('mining.remaining_time', { defaultValue: 'Remaining time : {time}', time: '' })}
                  <span className="block text-2xl font-extrabold tracking-wide text-accent-yellow">
                    {formatCountdown(miningRemainingTime)}
                  </span>
                </p>
                <p className="mt-2 text-center text-xs font-medium text-white/80">
                  {t('mining.rate', { defaultValue: 'mining rate per hour: {rate}', rate: '' })}
                  <span className="font-bold text-accent-yellow">
                    {formatRate(miningRate, t('balance.decimal_separator', { defaultValue: '.' }))}
                  </span>
                </p>
              </>
            ) : (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => void startMining()}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-9 py-3.5 text-sm font-bold text-primary shadow-soft transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      {t('mining.mine', { defaultValue: 'Click for mining' })}
                    </>
                  ) : (
                    t('mining.mine', { defaultValue: 'Click for mining' })
                  )}
                </button>
              </div>
            )}

            {walletUrl && (
              <div className="mt-6 text-center">
                <a
                  href={walletUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition hover:text-white"
                >
                  <Wallet size={18} strokeWidth={2.2} />
                  {t('balance.see_wallet', { defaultValue: 'See wallet' })}
                </a>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="mt-16 flex flex-col items-center gap-2 text-xs text-ink-soft">
            <Loader2 size={26} className="animate-spin text-primary" />
            {t('loading', { defaultValue: 'loading' })}
          </div>
        )}

        {!isLoggedIn && <LoginPanel />}
      </section>
    </div>
  )
}

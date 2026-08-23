import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Info, Loader2, Wallet, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  fetchDeliveryPenalitiesData,
  payDeliveryPenaltiesPiketplaceWallet,
  postPiPayment,
  verifyPayment,
} from '../lib/api'
import type { PenaltiesData } from '../types'
import { createPiPayment, initPi, waitForPi } from '../lib/pi'
import { formatAmount } from '../lib/format'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function Countdown({ remainingMs }: { remainingMs: number }) {
  const { t } = useTranslation()
  const [now, setNow] = useState(Date.now())
  const endRef = useRef(Date.now() + remainingMs)

  useEffect(() => {
    endRef.current = Date.now() + remainingMs
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [remainingMs])

  const diff = Math.max(0, endRef.current - now)
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  const tenths = Math.floor((diff % 1000) / 100)

  return (
    <span className="text-primary">
      {t('nb day(s)', { defaultValue: '{nb} day(s)', nb: days })}, {pad2(hours)}:{pad2(minutes)}:
      {pad2(seconds)}.{tenths}
    </span>
  )
}

export default function PayDeliveryPenaltiesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)
  const maintenanceMode = useAppSelector(
    (state) => state.settings.settings?.maintenance_mode === true,
  )
  const walletUrl = useAppSelector(
    (state) =>
      typeof state.settings.settings?.piket_wallet_frontend_url === 'string'
        ? (state.settings.settings.piket_wallet_frontend_url as string)
        : null,
  )

  const [isLoading, setIsLoading] = useState(true)
  const [penaltiesData, setPenaltiesData] = useState<PenaltiesData | null>(null)
  const [text, setText] = useState('')
  const [remainingTime, setRemainingTime] = useState(0)
  const [withTimeActivate, setWithTimeActivate] = useState(false)
  const [showPaymentBlock, setShowPaymentBlock] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  const verifierRef = useRef<number | null>(null)
  const metadataRef = useRef<Record<string, unknown>>({})

  useEffect(() => {
    return () => {
      if (verifierRef.current !== null) {
        window.clearInterval(verifierRef.current)
        verifierRef.current = null
      }
    }
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetchDeliveryPenalitiesData(token ?? undefined)
      setIsLoading(false)
      if (res.status === true) {
        if (res.is_still_penalized === false) {
          void Swal.fire({
            icon: 'success',
            title: t('info', { defaultValue: 'Info' }),
            text: t('cart.success', { defaultValue: 'Success' }),
            confirmButtonColor: '#ec11b5',
          }).then(() => navigate('/account'))
          return
        }
        const data = res.penalities_data ?? {}
        setPenaltiesData(data)
        setText(res.text ?? '')
        setRemainingTime(Number(res.remaining_time ?? 0))
        setWithTimeActivate(data.delivery_penalties_payment_with_time_activate === true)
      } else {
        void Swal.fire({
          icon: 'error',
          title: t('info', { defaultValue: 'Info' }),
          text: t('an_error_occured', { defaultValue: 'An error occurred' }),
          confirmButtonColor: '#ec11b5',
        })
      }
    } catch {
      setIsLoading(false)
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('an_error_occured', { defaultValue: 'An error occurred' }),
        confirmButtonColor: '#ec11b5',
      })
    }
  }, [token, t, navigate])

  useEffect(() => {
    if (maintenanceMode) {
      navigate('/maintenance')
      return
    }
    if (isLoggedIn) void loadData()
  }, [isLoggedIn, maintenanceMode, navigate, loadData])

  const showError = (message: string) => {
    void Swal.fire({
      icon: 'error',
      title: t('info', { defaultValue: 'Info' }),
      text: message,
      confirmButtonColor: '#ec11b5',
    })
  }

  const startPaymentVerifier = useCallback(() => {
    if (verifierRef.current !== null) window.clearInterval(verifierRef.current)
    const uniqueId = metadataRef.current.uniqueId as string
    verifierRef.current = window.setInterval(async () => {
      try {
        const res = await verifyPayment(token ?? undefined, uniqueId, user?.id)
        if (res.payment != null && verifierRef.current !== null) {
          window.clearInterval(verifierRef.current)
          verifierRef.current = null
          void Swal.fire({
            icon: 'success',
            title: t('info', { defaultValue: 'Info' }),
            text: t('cart.success', { defaultValue: 'Success' }),
            confirmButtonColor: '#ec11b5',
          }).then(() => void loadData())
        }
      } catch {
        // keep polling
      }
    }, 3000)
  }, [token, user?.id, t, loadData])

  const payPiketplaceCall = async (codePin: string) => {
    setIsPaying(true)
    try {
      const res = await payDeliveryPenaltiesPiketplaceWallet(token ?? undefined, codePin)
      setIsPaying(false)
      if (res.status === true) {
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('cart.success', { defaultValue: 'Success' }),
          confirmButtonColor: '#ec11b5',
        }).then(() => void loadData())
      } else if (res.message === 'message.not_enough_amount') {
        showError(
          t('not_enough_amount', {
            defaultValue: 'Not enough amount',
            amount: formatAmount(0),
          }),
        )
      } else if (res.message) {
        showError(t(res.message, { defaultValue: res.message }))
      } else {
        showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
      }
    } catch {
      setIsPaying(false)
      showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
    }
  }

  const payPiketplaceCallSetPinCode = async () => {
    setWalletOpen(false)
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
    await payPiketplaceCall(String(result.value))
  }

  const payPiNetworkWallet = async () => {
    setWalletOpen(false)
    setIsPaying(true)
    try {
      const res = await fetchDeliveryPenalitiesData(token ?? undefined)
      setIsPaying(false)
      if (res.status !== true || !res.penalities_data) {
        showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
        return
      }
      const data = res.penalities_data
      const uniqueId = crypto.randomUUID()
      const metadata: Record<string, unknown> = {
        ...data,
        uniqueId,
        userId: user?.id,
      }
      metadataRef.current = metadata
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
          amount: Number(data.penalties_amount_pi ?? 0),
          memo: data.memo ?? t('penalties', { defaultValue: 'Penalties' }),
          metadata,
        },
        {
          onReadyForServerApproval: (paymentId) =>
            void postPiPayment(token ?? undefined, user?.uid, 'approve', { paymentId }),
          onReadyForServerCompletion: (paymentId, txid) =>
            void postPiPayment(token ?? undefined, user?.uid, 'complete', { paymentId, txid }),
          onCancel: () => undefined,
          onError: () => undefined,
        },
      )
      startPaymentVerifier()
    } catch {
      setIsPaying(false)
      showError(t('please_use_pi_browser', { defaultValue: 'Please use the Pi browser' }))
    }
  }

  if (!isLoggedIn) {
    return <LoginPanel />
  }

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6 pt-16">
        {!isLoading && (
          <div className="min-h-[400px] rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
            <h1 className="my-2.5 text-center text-base font-bold text-ink">
              {t('penalties', { defaultValue: 'Penalties' })}
            </h1>

            {withTimeActivate && (
              <div className="text-center">
                <span>
                  {t('the account will be active in time', {
                    defaultValue: 'The account will be active in {time}',
                    time: '',
                  })}
                  {' '}
                  <Countdown remainingMs={remainingTime} />
                </span>
              </div>
            )}

            <p className="mt-3 rounded-[10px] bg-[#f0e68c] p-2.5 text-left leading-[18px] text-black">
              <Info size={14} className="mr-1 inline text-black" />
              {text}
            </p>

            {(showPaymentBlock || !withTimeActivate) && penaltiesData && (
              <div>
                <div className="mt-4 flex w-full items-start justify-between gap-4">
                  <p className="mb-0 text-sm font-semibold text-black">
                    {t('penalties amount to pay', { defaultValue: 'Penalties amount to pay' })}
                  </p>
                  <span className="text-right text-xs leading-[14px] text-primary">
                    <strong className="block">
                      {formatAmount(penaltiesData.penalties_amount_pi, 'π')}
                    </strong>
                    <div className="m-1 flex w-full items-center justify-between">
                      <hr className="w-[40%] border-slate-300" />
                      {t('or', { defaultValue: 'or' })}
                      <hr className="w-[40%] border-slate-300" />
                    </div>
                    <strong className="block font-black">
                      {formatAmount(penaltiesData.penalties_amount_piket, 'Piket')}
                    </strong>
                  </span>
                </div>
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setWalletOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-6 py-3 text-sm font-bold text-white shadow-soft transition hover:shadow-hover"
                  >
                    <Wallet size={17} />
                    {t('pay', { defaultValue: 'Pay' })}
                  </button>
                </div>
              </div>
            )}

            {withTimeActivate && (
              <button
                type="button"
                onClick={() => setShowPaymentBlock((prev) => !prev)}
                className="mt-3 block text-sm text-primary underline"
              >
                {!showPaymentBlock
                  ? t('activate account now', { defaultValue: 'Activate account now' })
                  : t('hide', { defaultValue: 'Hide' })}
              </button>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center gap-2 py-12 text-xs text-ink-soft">
            <img src="/site_images/index_loader.gif" alt="" className="ml-5 w-[70px] rounded-sm" />
            {t('loading', { defaultValue: 'loading' })}
          </div>
        )}
      </section>

      {walletOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setWalletOpen(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">
                {t('pay_with', { defaultValue: 'Pay with' })}
              </h3>
              <button
                type="button"
                onClick={() => setWalletOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => void payPiketplaceCallSetPinCode()}
                className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3.5 text-left text-sm font-bold text-white shadow-soft transition hover:opacity-90"
              >
                <Wallet size={18} />
                {t('piketplace_wallet', { defaultValue: 'Piketplace Wallet' })}
              </button>
              <button
                type="button"
                onClick={() => void payPiNetworkWallet()}
                className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-[#fbb148] to-[#f5a72b] px-4 py-3.5 text-left text-sm font-bold text-white shadow-soft transition hover:opacity-90"
              >
                <img src="/site_images/pi.png" alt="π" className="h-5 w-5 rounded-full object-cover" />
                {t('pinetwork_wallet', { defaultValue: 'Pi Network wallet' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaying && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <Loader2 size={32} className="animate-spin text-white" />
        </div>
      )}
    </div>
  )
}

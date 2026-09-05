import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { X, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { verifyPayment } from '../lib/api'

interface PiPaymentLoaderProps {
  open: boolean
  onClose: () => void
  token?: string | null
  uniqueId: string
  userId?: number
  verifyDelay?: number
  onVerified?: () => void
  successMessageKey?: string
}

const piLogoPath =
  'M20.4105 9.86058C20.3559 9.8571 20.2964 9.85712 20.2348 9.85715L20.2194 9.85715H17.8015C15.8086 9.85715 14.1033 11.4382 14.1033 13.5C14.1033 15.5618 15.8086 17.1429 17.8015 17.1429H20.2194L20.2348 17.1429C20.2964 17.1429 20.3559 17.1429 20.4105 17.1394C21.22 17.0879 21.9359 16.4495 21.9961 15.5577C22.0001 15.4992 22 15.4362 22 15.3778L22 15.3619V11.6381L22 11.6222C22 11.5638 22.0001 11.5008 21.9961 11.4423C21.9359 10.5506 21.22 9.91209 20.4105 9.86058ZM17.5872 14.4714C18.1002 14.4714 18.5162 14.0365 18.5162 13.5C18.5162 12.9635 18.1002 12.5286 17.5872 12.5286C17.0741 12.5286 16.6581 12.9635 16.6581 13.5C16.6581 14.0365 17.0741 14.4714 17.5872 14.4714Z'

export default function PiPaymentLoader({
  open,
  onClose,
  token,
  uniqueId,
  userId,
  verifyDelay = 15000,
  onVerified,
  successMessageKey = 'donation_thanks',
}: PiPaymentLoaderProps) {
  const { t } = useTranslation()
  const [verifyReady, setVerifyReady] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!open) {
      setVerifyReady(false)
      setVerifying(false)
      return
    }
    const timer = window.setTimeout(() => setVerifyReady(true), verifyDelay)
    return () => window.clearTimeout(timer)
  }, [open, verifyDelay])

  const handleVerify = async () => {
    if (verifying) return
    if (!uniqueId) return
    setVerifying(true)
    try {
      const res = await verifyPayment(token ?? undefined, uniqueId, userId)
      setVerifying(false)
      if (res.payment != null) {
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t(successMessageKey, { defaultValue: 'Payment completed successfully' }),
          confirmButtonColor: '#ec11b5',
        }).then(() => onVerified?.())
      } else {
        void Swal.fire({
          icon: 'info',
          title: t('info', { defaultValue: 'Info' }),
          text: t('payment_not_completed', {
            defaultValue: 'Payment not completed yet, please verify again after completing the payment',
          }),
          confirmButtonColor: '#ec11b5',
        })
      }
    } catch {
      setVerifying(false)
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('an_error_occured', { defaultValue: 'An error occurred' }),
        confirmButtonColor: '#ec11b5',
      })
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center bg-white px-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
        aria-label={t('close', { defaultValue: 'Close' })}
      >
        <X size={20} />
      </button>
      <div className="mt-24 flex flex-col items-center text-center">
        <svg
          width="170"
          height="170"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d={piLogoPath}
            fill="#a63289"
          />
        </svg>
        <h2 className="mt-6 text-lg font-bold text-ink">
          {t('pi_wallet_payment', { defaultValue: 'Pi wallet payment' })}
        </h2>
        {verifyReady && (
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={verifying}
            className="mt-8 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-8 py-3 text-sm font-bold text-white shadow-soft transition hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verifying ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              t('verify', { defaultValue: 'Verify' })
            )}
          </button>
        )}
      </div>
    </div>
  )
}
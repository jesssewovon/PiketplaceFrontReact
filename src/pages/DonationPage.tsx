import { useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { HandCoins, Loader2, Wallet, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { donateToPiketplaceWallet, postPiPayment } from '../lib/api'
import { createPiPayment, initPi, waitForPi } from '../lib/pi'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'
import PiPaymentLoader from '../components/PiPaymentLoader'

function sanitizeAmount(raw: string): string {
  let value = raw.replace(/[^\d.]/g, '')
  const dots = value.match(/\./g)
  if (dots && dots.length > 1) {
    value = value.replace(/\.$/, '')
  }
  const [whole, fraction] = value.split('.')
  if (fraction && fraction.length > 7) {
    value = `${whole}.${fraction.slice(0, 7)}`
  }
  return value
}

function isDecimalNotZero(value: string): boolean {
  if (!/^\d+(\.\d+)?$/.test(value)) return false
  return Number(value) > 0
}

export default function DonationPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)
  const settings = useAppSelector((state) => state.settings.settings)
  const walletUrl = useAppSelector((state) =>
    typeof state.settings.settings?.piket_wallet_frontend_url === 'string'
      ? (state.settings.settings.piket_wallet_frontend_url as string)
      : null
  )
  const projectName =
    typeof settings?.project_name === 'string' ? (settings.project_name as string) : 'Piketplace'

  const [amount, setAmount] = useState('')
  const [walletOpen, setWalletOpen] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [piLoaderOpen, setPiLoaderOpen] = useState(false)
  const uniqueIdRef = useRef<string>('')

  const payWith = () => {
    if (amount === '' || !isDecimalNotZero(amount)) {
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('fill_amount_field', { defaultValue: 'Please fill the amount field' }),
        confirmButtonColor: '#ec11b5',
      })
      return
    }
    setWalletOpen(true)
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

    setIsPaying(true)
    try {
      const res = await donateToPiketplaceWallet(token ?? undefined, user?.id ?? 0, amount, String(result.value))
      setIsPaying(false)
      if (res.status === true) {
        setAmount('')
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('donation_thanks', { defaultValue: 'Thanks for your donation' }),
          confirmButtonColor: '#ec11b5',
        })
      } else if (res.message === 'message.not_enough_amount') {
        void Swal.fire({
          icon: 'error',
          title: t('info', { defaultValue: 'Info' }),
          text: t('not_enough_amount', { defaultValue: 'Not enough amount' }),
          confirmButtonColor: '#ec11b5',
        })
      } else if (res.message) {
        void Swal.fire({
          icon: 'error',
          title: t('info', { defaultValue: 'Info' }),
          text: t(res.message, { defaultValue: res.message }),
          confirmButtonColor: '#ec11b5',
        })
      } else {
        void Swal.fire({
          icon: 'error',
          title: t('info', { defaultValue: 'Info' }),
          text: t('an_error_occured', { defaultValue: 'An error occurred' }),
          confirmButtonColor: '#ec11b5',
        })
      }
    } catch {
      setIsPaying(false)
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('an_error_occured', { defaultValue: 'An error occurred' }),
        confirmButtonColor: '#ec11b5',
      })
    }
  }

  const payPiNetworkWallet = async () => {
    setWalletOpen(false)
    const uniqueId = crypto.randomUUID()
    uniqueIdRef.current = uniqueId
    console.log('Generated uniqueId for Pi payment:', uniqueIdRef.current, uniqueId)
    const memo = t('memo donation of amount to name', {
      defaultValue: 'Donation of {amount} to {name}',
      amount: `${amount} π`,
      name: projectName,
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
      await window.Pi.authenticate(['username', 'payments'], onIncompletePaymentFound).catch(() => undefined)
      createPiPayment(
        {
          amount: Number(amount),
          memo,
          metadata: {
            userId: user?.id,
            uniqueId,
            type: 'donation',
          },
        },
        callbacks,
      )
      setPiLoaderOpen(true)
    } catch {
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('please_use_pi_browser', { defaultValue: 'Please use the Pi browser' }),
        confirmButtonColor: '#ec11b5',
      })
    }
  }

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        {isLoggedIn && (
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
            <h1 className="mb-5 text-center text-base font-bold text-ink">
              {t('to_support_piketplace', { defaultValue: 'To support Piketplace' })}
            </h1>
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5">
              <img
                src="/site_images/pi.png"
                alt="π"
                className="h-[15px] w-[15px] rounded-full object-cover"
              />
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                placeholder={t('amount', { defaultValue: 'Amount' })}
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
              />
              <em className="text-xs not-italic text-ink-soft">π</em>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={payWith}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-6 py-3 text-sm font-bold text-white shadow-soft transition hover:shadow-hover"
              >
                <HandCoins size={17} />
                {t('donate', { defaultValue: 'Donate' })}
              </button>
            </div>
          </div>
        )}

        {!isLoggedIn && <LoginPanel />}
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

      <PiPaymentLoader
        open={piLoaderOpen}
        token={token}
        uniqueId={uniqueIdRef.current}
        userId={user?.id}
        onClose={() => {
          setPiLoaderOpen(false)
          uniqueIdRef.current = ''
        }}
        onVerified={() => {
          setPiLoaderOpen(false)
          uniqueIdRef.current = ''
        }}
      />
    </div>
  )
}

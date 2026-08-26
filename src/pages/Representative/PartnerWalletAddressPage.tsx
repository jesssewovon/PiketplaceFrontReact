import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchPartnerWalletAddress, savePartnerWalletAddress } from '../../lib/api'
import { useAppSelector } from '../../store/hooks'
import LoginPanel from '../../components/LoginPanel'

export default function PartnerWalletAddressPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)

  const [walletAddress, setWalletAddress] = useState('')
  const [hasAccount, setHasAccount] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return
    setIsLoading(true)
    fetchPartnerWalletAddress(token ?? undefined)
      .then((res) => {
        if (res.status === true && res.partnerAccount) {
          setHasAccount(true)
          setWalletAddress(res.partnerAccount.wallet_address ?? '')
        } else {
          setHasAccount(false)
        }
      })
      .catch(() => setHasAccount(false))
      .finally(() => setIsLoading(false))
  }, [isLoggedIn, token])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await savePartnerWalletAddress(token ?? undefined, walletAddress)
      if (res.status === true) {
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('saved', { defaultValue: 'Saved' }),
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
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('an_error_occured', { defaultValue: 'An error occurred' }),
        confirmButtonColor: '#ec11b5',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-12 text-xs text-ink-soft">
            <Loader2 size={26} className="animate-spin text-primary" />
            {t('loading', { defaultValue: 'loading' })}
          </div>
        ) : hasAccount ? (
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
            <label
              htmlFor="wallet-address"
              className="mb-2 block text-[11px] font-semibold text-primary-dark"
            >
              {t('withdrawal.wallet_address', { defaultValue: 'Wallet address' })}
            </label>
            <input
              id="wallet-address"
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={t('withdrawal.wallet_address', { defaultValue: 'Wallet address' })}
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3.5 text-sm font-bold text-white shadow-soft transition hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                t('profilForm.save', { defaultValue: 'Save' })
              )}
            </button>
          </div>
        ) : !isLoggedIn ? (
          <LoginPanel />
        ) : (
          <p className="py-8 text-center text-xs font-medium text-ink-soft">
            {t('no_data', { defaultValue: 'No data' })}
          </p>
        )}
      </section>

      {!isLoggedIn && <LoginPanel />}
    </div>
  )
}

import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PartnerPaymentItem } from '../../types'
import { fetchPartnersPayment, proceedPartnersPayment } from '../../lib/api'
import { formatAmount } from '../../lib/format'
import { flagEmoji } from '../../lib/geo'
import { useAppSelector } from '../../store/hooks'
import LoginPanel from '../../components/LoginPanel'

export default function PartnersPaymentPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)

  const [data, setData] = useState<PartnerPaymentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return
    setIsLoading(true)
    fetchPartnersPayment(token ?? undefined)
      .then((res) => setData(res.data ?? []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false))
  }, [isLoggedIn, token])

  const handleProceed = async () => {
    setIsSaving(true)
    try {
      const res = await proceedPartnersPayment(token ?? undefined)
      if (res.status === true) {
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('successfully', { defaultValue: 'Successfully' }),
          confirmButtonColor: '#ec11b5',
        })
      } else {
        void Swal.fire({
          icon: 'error',
          title: t('info', { defaultValue: 'Info' }),
          text: res.message ? t(res.message, { defaultValue: res.message }) : t('an_error_occured', { defaultValue: 'An error occurred' }),
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
        ) : data.length > 0 ? (
          <div className="space-y-3">
            {data.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-4 shadow-soft"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {flagEmoji(item.partnerAccount?.country_code ?? '')}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    @{item.partnerAccount?.pi_username ?? ''}
                  </span>
                </div>
                <span className="text-sm font-bold text-primary">
                  {formatAmount(item.last_month_amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-xs font-medium text-ink-soft">
            {t('no_data', { defaultValue: 'No data' })}
          </p>
        )}

        {!isLoading && data.length > 0 && (
          <button
            type="button"
            onClick={() => void handleProceed()}
            disabled={isSaving}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3.5 text-sm font-bold text-white shadow-soft transition hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              t('proceed', { defaultValue: 'Proceed' })
            )}
          </button>
        )}
      </section>

      {!isLoggedIn && <LoginPanel />}
    </div>
  )
}

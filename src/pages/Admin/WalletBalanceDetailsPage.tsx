import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchWalletBalanceDetails } from '../../lib/api'
import type { WalletBalanceDetailsData } from '../../types'
import { formatDate } from '../../lib/format'
import { useAppSelector } from '../../store/hooks'
import LoginPanel from '../../components/LoginPanel'

function getTransactionColor(tr: Record<string, unknown>, username: string): string {
  if (tr.type_transaction === 'debit') return 'text-red-500'
  if (tr.type_transaction === 'withdraw') return 'text-red-500'
  if (tr.type_transaction === 'withdraw_fee') return 'text-red-500'
  if (tr.type_transaction === 'transfer' && (tr.wallet as Record<string, unknown> | undefined)?.user === username) return 'text-red-500'
  return 'text-green-600'
}

export default function WalletBalanceDetailsPage() {
  const { t } = useTranslation()
  const { username } = useParams<{ username: string }>()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)

  const [data, setData] = useState<WalletBalanceDetailsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isLoggedIn || !username) return
    setIsLoading(true)
    fetchWalletBalanceDetails(undefined, username)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false))
  }, [isLoggedIn, username])

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        {isLoggedIn && !isLoading && data && (
          <div className="space-y-2 rounded-2xl bg-white p-4 shadow-soft">
            <div className="flex justify-between text-xs">
              <span className="text-ink-soft">Pending withdraw</span>
              <span className="font-bold text-ink">{data.pending_withdraw ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-soft">Pending withdraw fee</span>
              <span className="font-bold text-ink">{data.pending_withdraw_fee ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-soft">Initial balance</span>
              <span className="font-bold text-ink">{data.user_wallet?.balance ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-soft">Current balance</span>
              <span className="font-bold text-ink">{data.pi_wallet?.realBalance ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-soft">Total Credit</span>
              <span className="font-bold text-green-600">{data.total_credit ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-soft">Total Debit</span>
              <span className="font-bold text-red-500">{data.total_debit ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-soft">Equilibre</span>
              <span className="font-bold text-ink">
                {data.equilibre ?? 0} {data.equilibre === 0 && <span className="text-green-600">✓</span>}
              </span>
            </div>

            <div className="mt-3 border-t border-black/5 pt-3">
              <p className="mb-2 text-[11px] font-bold text-ink">
                {data.transactions?.length ?? 0} transaction(s) found(s)
              </p>
              <div className="max-h-[400px] space-y-1 overflow-y-auto">
                {data.transactions?.map((tr, i) => (
                  <div
                    key={i}
                    className={`text-[10px] ${getTransactionColor(tr as Record<string, unknown>, username ?? '')}`}
                  >
                    <strong>{i + 1}</strong> • {formatDate(tr.created_at)} / {tr.type_transaction} / <strong>{tr.real_amount} Pi</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
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

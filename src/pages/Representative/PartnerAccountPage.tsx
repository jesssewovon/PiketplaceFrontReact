import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ShoppingBag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PartnerAccountInfo, PartnerAccountResponse } from '../../types'
import { fetchPartnerAccount } from '../../lib/api'
import { flagEmoji } from '../../lib/geo'
import countries from '../../locales/countries.json'
import { useAppSelector } from '../../store/hooks'
import LoginPanel from '../../components/LoginPanel'

function splitAmount(value: number | undefined): { whole: string; fraction: string } {
  const [whole, fraction] = (value ?? 0).toString().split('.')
  return { whole, fraction: fraction ?? '00' }
}

function AmountBlock({
  label,
  value,
  currency,
  separator,
}: {
  label: string
  value: number
  currency: string
  separator: string
}) {
  const { whole, fraction } = splitAmount(value)
  return (
    <div className="w-1/2 py-2">
      <p className="text-[10px] font-normal text-white/80">{label}</p>
      <h1 className="mt-1 text-lg font-bold text-white">
        <sup className="mr-0.5 text-xs font-semibold text-white/80">{currency}</sup>
        {whole}
        <span className="text-ink-soft/70">{separator}</span>
        <sup className="text-xs font-semibold text-white/80">{fraction}</sup>
      </h1>
    </div>
  )
}

export default function PartnerAccountPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const currency = useAppSelector((state) =>
    typeof state.settings.settings?.currency === 'string'
      ? (state.settings.settings.currency as string)
      : 'π'
  )

  const [data, setData] = useState<PartnerAccountResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return
    setIsLoading(true)
    fetchPartnerAccount(token ?? undefined)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false))
  }, [isLoggedIn, token])

  const partnerAccount: PartnerAccountInfo | null | undefined = data?.partnerAccount
  const country = countries.find((c) => c.iso2 === partnerAccount?.country_code)
  const countryName = country?.name ?? ''
  const separator = t('balance.decimal_separator', { defaultValue: '.' })

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        {isLoggedIn && data !== null && !isLoading && (
          <>
            {partnerAccount && (
              <h3 className="mb-4 text-center text-sm font-bold text-ink">
                {countryName} {flagEmoji(partnerAccount.country_code ?? '')}
              </h3>
            )}

            <div className="rounded-xl bg-gradient-to-br from-primary via-primary-dark to-primary-deep p-5 shadow-soft">
              <span className="text-xs font-semibold text-white/90">
                {t('estimated_incomes', { defaultValue: 'Estimated incomes' })}
              </span>
              <div className="mt-3 flex flex-wrap">
                {data.today_amount !== undefined && (
                  <AmountBlock
                    label={t('today', { defaultValue: 'Today' })}
                    value={data.today_amount}
                    currency={currency}
                    separator={separator}
                  />
                )}
                {data.yesterday_amount !== undefined && (
                  <AmountBlock
                    label={t('yesterday', { defaultValue: 'Yesterday' })}
                    value={data.yesterday_amount}
                    currency={currency}
                    separator={separator}
                  />
                )}
                {data.this_month_amount !== undefined && (
                  <AmountBlock
                    label={t('this_month', { defaultValue: 'This month' })}
                    value={data.this_month_amount}
                    currency={currency}
                    separator={separator}
                  />
                )}
                {data.last_month_amount !== undefined && (
                  <AmountBlock
                    label={t('last_month', { defaultValue: 'Last month' })}
                    value={data.last_month_amount}
                    currency={currency}
                    separator={separator}
                  />
                )}
              </div>
            </div>

            {partnerAccount && (
              <div className="mt-3 rounded-xl bg-gradient-to-br from-primary via-primary-dark to-primary-deep p-5 shadow-soft">
                <span className="text-xs font-semibold text-white/90">
                  {t('side_menu.balance', { defaultValue: 'Balance' })}
                </span>
                <h1 className="mt-3 text-2xl font-extrabold text-white">
                  <sup className="mr-0.5 text-xs font-semibold text-white/80">{currency}</sup>
                  {splitAmount(partnerAccount.balance).whole}
                  <span className="text-ink-soft/70">{separator}</span>
                  <sup className="text-xs font-semibold text-white/80">
                    {splitAmount(partnerAccount.balance).fraction}
                  </sup>
                </h1>
              </div>
            )}

            <div className="mt-3 rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
              <p className="text-xs leading-relaxed text-ink-soft">
                <span className="mr-1">&#9711;</span>
                {t('partner_minimum_balance_withdrawal', {
                  defaultValue: 'Minimum balance for withdrawal is {amount}',
                  amount: `10 ${currency}`,
                })}
              </p>
              <div className="mt-5 flex justify-center">
                <div className="text-center">
                  <h6 className="text-lg font-bold text-ink">{data.nb_orders ?? 0}</h6>
                  <Link
                    to="/partner-orders"
                    className="mx-auto mt-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary-deep text-white shadow-soft transition hover:opacity-90"
                    aria-label={t('orders', { defaultValue: 'Orders' })}
                  >
                    <ShoppingBag size={22} />
                  </Link>
                  <p className="mt-2 text-[11px] font-medium text-ink-soft">
                    {t('orders', { defaultValue: 'Orders' })}
                  </p>
                </div>
              </div>
            </div>
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

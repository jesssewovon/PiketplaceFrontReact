import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, RefreshCw, Settings, Users, Package, ShoppingBag, CreditCard, PhoneCall, Wallet, Store, DollarSign } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchAdministration } from '../lib/api'
import type { AdministrationData, AdminSettingItem } from '../types'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

function AdminLink({ to, icon: Icon, label, count }: { to: string; icon: typeof Settings; label: string; count?: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {count !== undefined && <h6 className="text-xs font-bold text-ink">{count}</h6>}
      <Link
        to={to}
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#583e77] text-white shadow-soft transition hover:opacity-90"
      >
        <Icon size={20} />
      </Link>
      <p className="text-[10px] text-center text-ink-soft">{label}</p>
    </div>
  )
}

function splitAmount(value: number | undefined): { whole: string; fraction: string } {
  const [whole, fraction] = (value ?? 0).toString().split('.')
  return { whole, fraction: fraction ?? '00' }
}

function thousandSeparator(n: number | undefined): string {
  return (n ?? 0).toLocaleString('en-US')
}

export default function AdministrationPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)
  const currency = useAppSelector((state) =>
    typeof state.settings.settings?.currency === 'string'
      ? (state.settings.settings.currency as string)
      : 'π'
  )

  const [data, setData] = useState<AdministrationData | null>(null)
  const [settings, setSettings] = useState<AdminSettingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const getData = () => {
    if (!isLoggedIn || !user?.uid) return
    setIsLoading(true)
    fetchAdministration(token ?? undefined, user.uid)
      .then((res) => {
        setData(res.data ?? null)
        setSettings(res.settings ?? [])
      })
      .catch(() => {
        setData(null)
        setSettings([])
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    getData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token, user?.uid])

  const balanceItem = settings.find((s) => s.name === 'balance')
  const balance = typeof balanceItem?.value === 'number' ? balanceItem.value : 0
  const { whole: balanceWhole, fraction: balanceFraction } = splitAmount(balance)
  const { whole: tokenWhole, fraction: tokenFraction } = splitAmount(data?.total_token_amount)
  const separator = t('balance.decimal_separator', { defaultValue: '.' })

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        {isLoggedIn && !isLoading && data !== null && (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-[#583e77] to-[#3a2550] p-5 shadow-soft">
              <span className="text-xs font-semibold text-white/90">
                {t('side_menu.balance', { defaultValue: 'Balance' })}
              </span>
              <h1 className="mt-2 text-2xl font-extrabold text-white">
                <sup className="mr-0.5 text-xs font-semibold text-white/80">{currency}</sup>
                {balanceWhole}
                <span className="text-white/60">{separator}</span>
                <sup className="text-xs font-semibold text-white/80">{balanceFraction}</sup>
              </h1>

              <div className="mt-4">
                <span className="text-[10px] font-semibold text-white/70">
                  PIKET ({t('admin.total_distributed', { defaultValue: 'Total distribué' })})
                </span>
                <h1 className="mt-1 text-lg font-bold text-white">
                  <sup className="mr-0.5 text-xs font-semibold text-white/80">PIKET </sup>
                  {tokenWhole}
                  <span className="text-white/60">{separator}</span>
                  <sup className="text-xs font-semibold text-white/80">{tokenFraction}</sup>
                </h1>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-white/90">
                <span>{t('admin.ads_views', { defaultValue: 'Ads views' })}: {thousandSeparator(data.nb_rewarded_ads)}</span>
                <button type="button" onClick={getData} className="text-white/70 transition hover:text-white">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4">
              <AdminLink
                to="/admin/settings"
                icon={Settings}
                label={t('admin.settings', { defaultValue: 'Paramètres' })}
                count={data.nb_settings}
              />
              <AdminLink
                to="/users"
                icon={Users}
                label={t('admin.users', { defaultValue: 'Utilisateurs' })}
                count={`${data.nb_daily_active_users ?? 0}/${data.nb_users ?? 0}`}
              />
              <AdminLink
                to="/admin-products"
                icon={Package}
                label={t('admin.products', { defaultValue: 'Produits' })}
                count={`${data.nb_products_pending ?? 0}/${data.nb_products ?? 0}`}
              />
              <AdminLink
                to="/admin-orders"
                icon={ShoppingBag}
                label={t('admin.orders', { defaultValue: 'Commandes' })}
                count={`${data.nb_orders_shipped ?? 0}/${data.nb_orders ?? 0}`}
              />
              <AdminLink
                to="/failed-payments"
                icon={CreditCard}
                label={t('admin.failed_payments', { defaultValue: 'Paiements échoués' })}
                count={data.nb_failed_payments}
              />
              <AdminLink
                to="/support-contacts"
                icon={PhoneCall}
                label={t('admin.contacts', { defaultValue: 'Contacts' })}
                count={data.nb_contacts}
              />
              <AdminLink
                to="/admin-withdrawals"
                icon={Wallet}
                label={t('admin.withdrawals', { defaultValue: 'Retraits' })}
                count={data.nb_withdrawal}
              />
              <AdminLink
                to="/users"
                icon={Store}
                label={t('admin.stores', { defaultValue: 'Boutiques' })}
              />
              <AdminLink
                to="/partners-payment"
                icon={DollarSign}
                label={t('admin.partner_payment', { defaultValue: 'Partner Payment' })}
              />
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

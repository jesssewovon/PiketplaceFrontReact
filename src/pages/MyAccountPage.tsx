import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import {
  Store,
  BadgeDollarSign,
  ShoppingBag,
  MessageSquare,
  FileText,
  HelpCircle,
  HeartHandshake,
  Rocket,
  UserCheck,
  UserCircle,
  Globe,
  HandCoins,
  Pickaxe,
  Languages,
  MapPin,
  Wallet,
  LogOut,
  X,
  Check,
  Settings,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { flagEmoji } from '../lib/geo'
import i18n, { SUPPORTED_LANGUAGES } from '../i18n'
import LoginPanel from '../components/LoginPanel'
import { signOut } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../store/authSlice'
import { setSettings } from '../store/settingsSlice'

interface AccountLink {
  to?: string
  labelKey: string
  labelFallback: string
  icon: typeof Store
  onClick?: () => void
  blink?: boolean
}

interface AccountGroup {
  titleKey: string
  titleFallback: string
  items: AccountLink[]
}

const groups: AccountGroup[] = [
  {
    titleKey: 'side_menu.shop_orders',
    titleFallback: 'Shop & Orders',
    items: [
      { to: '/profil', labelKey: 'side_menu.my_profile', labelFallback: 'My profile', icon: UserCircle },
      { to: '/my-store', labelKey: 'side_menu.my_store', labelFallback: 'My store', icon: Store },
      { to: '/my-sales', labelKey: 'side_menu.my_sales', labelFallback: 'My sales', icon: BadgeDollarSign },
      { to: '/my-orders', labelKey: 'side_menu.my_orders', labelFallback: 'My orders', icon: ShoppingBag },
      { to: '/message-contacts', labelKey: 'messages', labelFallback: 'Messages', icon: MessageSquare },
    ],
  },
  {
    titleKey: 'side_menu.services_info',
    titleFallback: 'Services & info',
    items: [
      { to: '/terms', labelKey: 'side_menu.terms_and_conditions', labelFallback: 'Terms & conditions', icon: FileText },
      { to: '/faq', labelKey: 'faq', labelFallback: 'Q&A', icon: HelpCircle },
      { to: '/partnerships', labelKey: 'partnerships', labelFallback: 'Partnerships', icon: HeartHandshake },
      { to: '/unlock-boost', labelKey: 'unlock_boost', labelFallback: 'Unlock boost', icon: Rocket, blink: true },
    ],
  },
  {
    titleKey: 'side_menu.country_representative',
    titleFallback: 'Country representative',
    items: [
      { to: '/partner-account', labelKey: 'side_menu.representative_account', labelFallback: "Representative's account", icon: UserCheck },
      { to: '/partner-orders', labelKey: 'side_menu.orders_verification', labelFallback: 'Verification of orders', icon: Globe },
      { to: '/partner-wallet-address', labelKey: 'side_menu.partner_wallet_address', labelFallback: 'Wallet address', icon: Wallet },
    ],
  },
  {
    titleKey: 'side_menu.others',
    titleFallback: 'Others',
    items: [
      { to: '/donation', labelKey: 'donation', labelFallback: 'Donation', icon: HandCoins },
      { to: '/mining', labelKey: 'side_menu.mining', labelFallback: 'Mining', icon: Pickaxe },
      { labelKey: 'side_menu.language', labelFallback: 'Language', icon: Languages },
      { to: '/my-addresses', labelKey: 'side_menu.my_addresses', labelFallback: 'My addresses', icon: MapPin },
    ],
  },
]

const languages = SUPPORTED_LANGUAGES.filter((l) => l.active).sort((a, b) => a.order - b.order)

function ActionGrid({ items, onLanguages }: { items: AccountLink[]; onLanguages: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map(({ to, labelKey, labelFallback, icon: Icon, onClick, blink }) => {
        const content = (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#abd6e34d] text-primary">
              <Icon size={20} strokeWidth={2.2} />
            </span>
            <span className="text-center text-[10px] font-semibold leading-tight text-ink-soft">
              {t(labelKey, { defaultValue: labelFallback })}
            </span>
          </>
        )
        const className = `flex w-full flex-col items-center gap-2 rounded-2xl bg-white p-3.5${blink ? ' animate-blink' : ''}`
        return to ? (
          <Link key={labelKey} to={to} className={className}>
            {content}
          </Link>
        ) : (
          <button key={labelKey} type="button" onClick={onClick ?? onLanguages} className={className}>
            {content}
          </button>
        )
      })}
    </div>
  )
}

export default function MyAccountPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [signingOut, setSigningOut] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const isPartner = useAppSelector((state) => state.auth.user?.is_partner === true)
  const permissions = useAppSelector((state) => state.auth.permissions)
  const isAdmin = Array.isArray(permissions) && permissions.includes('browse_settings')
  const walletUrl = useAppSelector((state) =>
    typeof state.settings.settings?.piket_wallet_frontend_url === 'string'
      ? (state.settings.settings.piket_wallet_frontend_url as string)
      : null
  )
  const visibleGroups = groups.filter(
    (group) =>
      group.titleKey !== 'side_menu.country_representative' || isPartner,
  )

  const currentLang = i18n.language.split('-')[0]

  const performLogout = async () => {
    setSigningOut(true)
    try {
      await signOut(token ?? undefined)
    } finally {
      dispatch(logout())
      dispatch(setSettings(null))
      setSigningOut(false)
    }
  }

  const handleLogout = () => {
    void Swal.fire({
      icon: 'warning',
      title: t('confirmation.you_sure', { defaultValue: 'Are you sure?' }),
      text: t('logout_confirmation_text', {
        defaultValue: 'You are about to log out of your account.',
      }),
      showCancelButton: true,
      confirmButtonText: t('side_menu.log_out', { defaultValue: 'Log out' }),
      cancelButtonText: t('confirmation.no_cancel', { defaultValue: 'No, cancel' }),
      confirmButtonColor: '#ec11b5',
    }).then((result) => {
      if (result.isConfirmed) {
        void performLogout()
      }
    })
  }

  const selectLanguage = (code: string) => {
    void i18n.changeLanguage(code)
    setLangOpen(false)
  }

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        {isAdmin && (
          <Link
            to="/administration"
            className="mb-5 flex items-center justify-center rounded-2xl border border-black/5 bg-white p-[2px] shadow-soft transition-all duration-300 hover:shadow-hover"
          >
            <span className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-white px-4 py-3 text-sm font-bold">
              <Settings size={18} strokeWidth={2.2} className="text-primary" />
              <span className="text-ink">
                {t('admin.administration', { defaultValue: 'Administration' })}
              </span>
            </span>
          </Link>
        )}

        {walletUrl && (
          <a
            href={walletUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-5 flex items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-primary-deep p-[2px] shadow-soft transition-all duration-300 hover:shadow-hover"
          >
            <span className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-white px-4 py-3 text-sm font-bold">
              <Wallet size={18} strokeWidth={2.2} className="text-primary" />
              <span className="bg-gradient-to-r from-primary to-primary-deep bg-clip-text text-transparent">
                {t('account_open_wallet', { defaultValue: 'Open Pi Wallet' })}
              </span>
            </span>
          </a>
        )}

        {visibleGroups.map((group) => (
          <div
            key={group.titleKey}
            className={group.titleKey === groups[0].titleKey ? '' : 'mt-7'}
          >
            <h2 className="mb-3 text-sm font-bold text-primary-dark">
              {t(group.titleKey, { defaultValue: group.titleFallback })}
            </h2>
            <ActionGrid items={group.items} onLanguages={() => setLangOpen(true)} />
          </div>
        ))}

        {isLoggedIn && (
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3.5 text-sm font-bold text-white shadow-soft transition-all duration-300 hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={18} strokeWidth={2.2} />
            {signingOut
              ? t('account_signing_out', { defaultValue: 'Signing out...' })
              : t('side_menu.log_out', { defaultValue: 'Log out' })}
          </button>
        )}
      </section>

      {!isLoggedIn && <LoginPanel />}

      {langOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setLangOpen(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 py-2"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary-dark">
                {t('side_menu.language', { defaultValue: 'Choose language' })}
              </h3>
              <button
                type="button"
                onClick={() => setLangOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid max-h-[67vh] grid-cols-2 gap-2 overflow-y-auto">
              {languages.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => selectLanguage(item.code)}
                  className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-ink transition hover:bg-pink-50"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-base leading-none">{flagEmoji(item.country_code)}</span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  {item.code === currentLang && <Check size={18} className="shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

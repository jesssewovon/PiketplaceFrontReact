import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
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
  Megaphone,
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
      { to: '/my-ads', labelKey: 'my_ads', labelFallback: 'My ads', icon: Megaphone },
      { to: '/donation', labelKey: 'donation', labelFallback: 'Donation', icon: HandCoins },
      { to: '/mining', labelKey: 'side_menu.mining', labelFallback: 'Mining', icon: Pickaxe },
      { labelKey: 'side_menu.language', labelFallback: 'Language', icon: Languages },
      { to: '/my-addresses', labelKey: 'side_menu.my_addresses', labelFallback: 'My addresses', icon: MapPin },
    ],
  },
]

const languages = SUPPORTED_LANGUAGES.filter((l) => l.active).sort((a, b) => a.order - b.order)

const telegramCountries = [
  {
    code: 'en',
    country: 'US',
    handle: 'piketplace_international',
  },
  {
    code: 'CN',
    country: 'CN',
    handle: 'piketplace_china',
  },
  {
    code: 'VN',
    country: 'VN',
    handle: 'piketplace_vietnam',
  },
  {
    code: 'YE',
    country: 'YE',
    handle: 'piketplaceyemen',
  },
  {
    code: 'EG',
    country: 'EG',
    handle: 'piketplace_egypt',
  },
  {
    code: 'IN',
    country: 'IN',
    handle: 'piketplace_India',
  },
  {
    code: 'TH',
    country: 'TH',
    handle: 'piketplace_thailand',
  },
  {
    code: 'NG',
    country: 'NG',
    handle: 'piketplace_nigeria',
  },
  {
    code: 'BJ',
    country: 'BJ',
    handle: 'piketplace_benin',
  },
  {
    code: 'CI',
    country: 'CI',
    handle: 'piketplace_cotedivoire',
  },
  {
    code: 'CM',
    country: 'CM',
    handle: 'piketplace_cameroun',
  },
  {
    code: 'TG',
    country: 'TG',
    handle: 'piketplace_togo',
  },
  {
    code: 'BF',
    country: 'BF',
    handle: 'piketplace_BurkinaFaso',
  }
]

function ActionGrid({ items, onLanguages }: { items: AccountLink[]; onLanguages: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-4 gap-1">
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
        const className = `flex w-full flex-col items-center gap-2 rounded-2xl bg-white p-1.5${blink ? ' animate-blink' : ''}`
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
  const [socialOpen, setSocialOpen] = useState(false)

  const openSocial = (url: string) => {
    if (typeof window !== 'undefined' && window.Pi) {
      window.Pi.openUrlInSystemBrowser(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

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
        <div className="mb-5 grid grid-cols-3 gap-3">
          {isAdmin && (
            <Link
              to="/administration"
              className="flex items-center justify-center rounded-2xl border border-black/5 bg-white p-[2px] shadow-soft transition-all duration-300 hover:shadow-hover"
            >
              <span className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-white px-4 py-3 text-sm font-bold">
                <Settings size={18} strokeWidth={2.2} className="text-primary" />
                {/* <span className="text-ink">
                  {t('admin.administration', { defaultValue: 'Administration' })}
                </span> */}
              </span>
            </Link>
          )}

          {walletUrl && (
            <a
              href={walletUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-primary-deep p-[2px] shadow-soft transition-all duration-300 hover:shadow-hover"
            >
              <span className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-white px-4 py-3 text-sm font-bold">
                PIKET <Wallet size={18} strokeWidth={2.2} className="text-primary" />
                {/* <span className="bg-gradient-to-r from-primary to-primary-deep bg-clip-text text-transparent">
                  {t('go to Piket wallet', { defaultValue: 'Open Pi Wallet' })}
                </span> */}
              </span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setSocialOpen(true)}
            className="flex items-center justify-center rounded-2xl border border-black/5 bg-white p-[2px] shadow-soft transition-all duration-300 hover:shadow-hover"
          >
            <span className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-white px-4 py-3 text-sm font-bold">
              <Globe size={18} strokeWidth={2.2} className="text-primary" />
            </span>
          </button>
        </div>

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

      {langOpen &&
        createPortal(
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
          </div>,
          document.body,
        )}

      {socialOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setSocialOpen(false)}
          >
            <div
              className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-primary-dark">
                  {t('piketplace.social_media', { defaultValue: 'Follow us' })}
                </h3>
                <button
                  type="button"
                  onClick={() => setSocialOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-2.5">
                <a
                  href="https://youtube.com/@piketplace"
                  onClick={(event) => {
                    event.preventDefault()
                    openSocial('https://youtube.com/@piketplace')
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  YouTube
                </a>
                <a
                  href="https://x.com/piketplace"
                  onClick={(event) => {
                    event.preventDefault()
                    openSocial('https://x.com/piketplace')
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X (Twitter)
                </a>
                <a
                  href="https://facebook.com/piketplace"
                  onClick={(event) => {
                    event.preventDefault()
                    openSocial('https://facebook.com/piketplace')
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-100"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </a>
                <a
                  href="https://instagram.com/piketplace"
                  onClick={(event) => {
                    event.preventDefault()
                    openSocial('https://instagram.com/piketplace')
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 text-sm font-bold text-pink-600 transition hover:from-purple-100 hover:to-pink-100"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                  Instagram
                </a>
                <div className="pt-1 px-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-500">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    Telegram
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {telegramCountries.map((item) => (
                      <button
                        key={item.handle}
                        type="button"
                        title={item.handle}
                        onClick={() => openSocial(`https://t.me/${item.handle}`)}
                        className="flex items-center justify-center rounded-xl bg-slate-50 px-3 py-2 transition hover:bg-blue-100"
                      >
                        <span className="text-lg leading-none">{flagEmoji(item.country)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

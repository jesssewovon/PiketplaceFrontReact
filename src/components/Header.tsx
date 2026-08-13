import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, Search, User, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { flagEmoji, getCountryCode } from '../lib/geo'
import { useAppSelector } from '../store/hooks'

const PAGE_TITLES: Record<string, { key: string; fallback: string }> = {
  '/publish': { key: 'page_title_publish', fallback: 'Publish' },
  '/account': { key: 'side_menu.my_account', fallback: 'My Account' },
  '/account/sales': { key: 'side_menu.my_sales', fallback: 'My Sales' },
  '/account/orders': { key: 'side_menu.my_orders', fallback: 'My Orders' },
  '/account/products': { key: 'page_title_my_products', fallback: 'My Products' },
  '/my-store': { key: 'my_store', fallback: 'My Store' },
  '/my-sales': { key: 'my_sales', fallback: 'My Sales' },
  '/my-orders': { key: 'my_orders', fallback: 'My Orders' },
  '/message-contacts': { key: 'messages', fallback: 'Messages' },
  '/terms': { key: 'side_menu.terms_and_conditions', fallback: 'Terms & Conditions' },
  '/faq': { key: 'faq', fallback: 'FAQ' },
  '/partnerships': { key: 'our_partnerships', fallback: 'Partnerships' },
  '/unlock-boost': { key: 'unlock_boost', fallback: 'Unlock Boost' },
  '/pi-ad-boost-histories': { key: 'history', fallback: 'History' },
  '/partner-account': { key: 'side_menu.representative_account', fallback: 'Representative Account' },
  '/partner-orders': { key: 'side_menu.orders_verification', fallback: 'Orders Verification' },
  '/donation': { key: 'donation', fallback: 'Donation' },
  '/my-addresses': { key: 'side_menu.my_addresses', fallback: 'My Addresses' },
  '/mining': { key: 'side_menu.mining', fallback: 'Mining' },
  '/account/mining': { key: 'side_menu.mining', fallback: 'Mining' },
  '/account/messages': { key: 'messages', fallback: 'Messages' },
  '/account/wallet': { key: 'wallet', fallback: 'Wallet' },
  '/account/favorites': { key: 'page_title_favorites', fallback: 'Favorites' },
  '/account/reviews': { key: 'page_title_reviews', fallback: 'Reviews' },
  '/account/shipping': { key: 'page_title_shipping', fallback: 'Shipping' },
  '/account/searches': { key: 'page_title_saved_searches', fallback: 'Saved Searches' },
  '/account/settings': { key: 'side_menu.settings', fallback: 'Settings' },
  '/account/support': { key: 'side_menu.support', fallback: 'Help & Support' },
}

const iconButton =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-0 border-black/10 text-ink transition hover:border-primary hover:text-primary'

export default function Header() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const user = useAppSelector((state) => state.auth.user)
  const isHome = location.pathname === '/'
  const country = getCountryCode()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : '/')
  }

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  if (isHome) {
    return (
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink transition"
            aria-label={t('back', { defaultValue: 'Back' })}
          >
            {/* <ArrowLeft size={19} /> */}
            <svg className="tw:ml-[10px] tw:align-[sub!important] tw:inline" width="20px" height="20px" viewBox="0 0 75.80 75.80" xmlns="http://www.w3.org/2000/svg" fill="#000000" stroke="#000000" stroke-width="0.00075803"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="2.27409"> <g id="Group_64" data-name="Group 64" transform="translate(-624.082 -383.588)"> <path id="Path_56" data-name="Path 56" d="M660.313,383.588a1.5,1.5,0,0,1,1.06,2.561l-33.556,33.56a2.528,2.528,0,0,0,0,3.564l33.556,33.558a1.5,1.5,0,0,1-2.121,2.121L625.7,425.394a5.527,5.527,0,0,1,0-7.807l33.556-33.559A1.5,1.5,0,0,1,660.313,383.588Z" fill="#a63289"></path> </g> </g><g id="SVGRepo_iconCarrier"> <g id="Group_64" data-name="Group 64" transform="translate(-624.082 -383.588)"> <path id="Path_56" data-name="Path 56" d="M660.313,383.588a1.5,1.5,0,0,1,1.06,2.561l-33.556,33.56a2.528,2.528,0,0,0,0,3.564l33.556,33.558a1.5,1.5,0,0,1-2.121,2.121L625.7,425.394a5.527,5.527,0,0,1,0-7.807l33.556-33.559A1.5,1.5,0,0,1,660.313,383.588Z" fill="#a63289"></path> </g> </g></svg>
          </button>

          <form
            onSubmit={handleSubmit}
            className="flex flex-1 items-stretch overflow-hidden rounded-3xl border border-black/10 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
          >
            <div className="relative flex-1">
              {/* <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              /> */}
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search_product', { defaultValue: 'Search products…' })}
                className="h-9 w-full bg-transparent pl-4 pr-8 text-sm text-ink outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    navigate('/')
                  }}
                  className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft transition hover:bg-black/5"
                  aria-label={t('header_clear_search', { defaultValue: 'Clear search' })}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="flex h-9 items-center gap-1 bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
              aria-label={t('search', { defaultValue: 'Search' })}
            >
              <Search size={15} />
            </button>
          </form>

          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-0 border-black/10 text-base"
            title={t('header_country_title', { country, defaultValue: 'Country: {country}' })}
          >
            {flagEmoji(country)}
          </span>

          <Link
            to="/account/messages"
            className={`relative ${iconButton}`}
            aria-label={t('header_notifications', { defaultValue: 'Notifications' })}
          >
            <Bell size={16} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
          </Link>

          <Link to="/account" className={iconButton} aria-label={t('side_menu.my_account', { defaultValue: 'My account' })}>
            <User size={16} />
          </Link>
        </div>
      </header>
    )
  }

  const pageTitle = PAGE_TITLES[location.pathname] ?? (location.pathname.startsWith('/product/') ? { key: 'product.details', fallback: 'Product' } : undefined)
  const title = t(pageTitle?.key ?? 'app_name', { defaultValue: pageTitle?.fallback ?? 'Piketplace' })
  const isAccountPage = location.pathname === '/account'
  const showConnectedUser = isAccountPage && isLoggedIn && user

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/70 backdrop-blur-md">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink transition"
            aria-label={t('back', { defaultValue: 'Back' })}
          >
            {/* <ArrowLeft size={19} /> */}
            <svg className="tw:ml-[10px] tw:align-[sub!important] tw:inline" width="20px" height="20px" viewBox="0 0 75.80 75.80" xmlns="http://www.w3.org/2000/svg" fill="#000000" stroke="#000000" stroke-width="0.00075803"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="2.27409"> <g id="Group_64" data-name="Group 64" transform="translate(-624.082 -383.588)"> <path id="Path_56" data-name="Path 56" d="M660.313,383.588a1.5,1.5,0,0,1,1.06,2.561l-33.556,33.56a2.528,2.528,0,0,0,0,3.564l33.556,33.558a1.5,1.5,0,0,1-2.121,2.121L625.7,425.394a5.527,5.527,0,0,1,0-7.807l33.556-33.559A1.5,1.5,0,0,1,660.313,383.588Z" fill="#a63289"></path> </g> </g><g id="SVGRepo_iconCarrier"> <g id="Group_64" data-name="Group 64" transform="translate(-624.082 -383.588)"> <path id="Path_56" data-name="Path 56" d="M660.313,383.588a1.5,1.5,0,0,1,1.06,2.561l-33.556,33.56a2.528,2.528,0,0,0,0,3.564l33.556,33.558a1.5,1.5,0,0,1-2.121,2.121L625.7,425.394a5.527,5.527,0,0,1,0-7.807l33.556-33.559A1.5,1.5,0,0,1,660.313,383.588Z" fill="#a63289"></path> </g> </g></svg>
          </button>
          {showConnectedUser ? (
            <div className="flex min-w-0 items-center gap-2.5">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-primary/30"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-sm font-bold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {t('hello_user', { name: user.username, defaultValue: 'Hi {name}!' })}
                </p>
                <p className="truncate text-[10px] text-ink-soft">
                  {user.email ?? `@${user.username}`}
                </p>
              </div>
            </div>
          ) : (
            <h1 className="truncate text-base font-bold text-ink">{title}</h1>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            to="/account/messages"
            className={`relative ${iconButton}`}
            aria-label={t('header_notifications', { defaultValue: 'Notifications' })}
          >
            <Bell size={16} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
          </Link>
          <Link to="/account" className={iconButton} aria-label={t('side_menu.my_account', { defaultValue: 'My account' })}>
            <User size={16} />
          </Link>
        </div>
      </div>
    </header>
  )
}

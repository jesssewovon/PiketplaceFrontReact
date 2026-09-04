import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HomeIcon from './HomeIcon'
import PublishIcon from './PublishIcon'
import AccountIcon from './AccountIcon'

type IconKind = 'home' | 'publish' | 'account'

interface Tab {
  to: string
  labelKey: string
  labelFallback: string
  icon: IconKind
}

const tabs: Tab[] = [
  { to: '/', labelKey: 'home_', labelFallback: 'Home', icon: 'home' },
  { to: '/publish', labelKey: 'publish', labelFallback: 'Publish', icon: 'publish' },
  { to: '/account', labelKey: 'side_menu.my_account', labelFallback: 'My Account', icon: 'account' },
]

const icons: Record<IconKind, (color: string) => ReactElement> = {
  home: (color) => <HomeIcon color={color} className="mx-auto" />,
  publish: (color) => <PublishIcon color={color} className="mx-auto" />,
  account: (color) => <AccountIcon color={color} className="mx-auto" />,
}

export default function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[430px] items-stretch">
        {tabs.map(({ to, labelKey, labelFallback, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-primary' : 'text-ink-soft hover:text-primary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {icon === 'publish' ? (
                  <span
                    className={`-mt-7 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-white shadow-soft transition-all duration-200 ${
                      isActive ? 'scale-105 ring-4 ring-primary/20' : ''
                    }`}
                  >
                    <PublishIcon color="#ffffff" className="mx-auto" />
                  </span>
                ) : (
                  <span className="flex h-8 w-12 items-center justify-center">
                    {icons[icon](isActive ? '#ec11b5' : '#6c757d')}
                  </span>
                )}
                {t(labelKey, { defaultValue: labelFallback })}
              </>
            )}
          </NavLink>
        ))}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-transparent" />
    </nav>
  )
}

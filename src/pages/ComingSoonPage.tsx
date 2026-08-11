import { Link } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ComingSoonPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-deep text-white shadow-soft">
        <Hammer size={30} />
      </span>
      <h1 className="text-lg font-bold text-primary-dark">{t('coming_soon_title', { defaultValue: 'Coming soon' })}</h1>
      <p className="max-w-[260px] text-xs leading-relaxed text-ink-soft">
        {t('coming_soon_subtitle', {
          defaultValue: "This section is under construction. We're working hard to bring it to you.",
        })}
      </p>
      <Link
        to="/"
        className="mt-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
      >
        {t('coming_soon_back_home', { defaultValue: 'Back to home' })}
      </Link>
    </div>
  )
}

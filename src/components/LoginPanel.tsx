import { useState } from 'react'
import { AlertCircle, Check, Languages, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { loginWithPi } from '../lib/auth'
import { flagEmoji } from '../lib/geo'
import { useAppDispatch } from '../store/hooks'
import i18n, { SUPPORTED_LANGUAGES } from '../i18n'

const languages = SUPPORTED_LANGUAGES.filter((l) => l.active).sort((a, b) => a.order - b.order)

export default function LoginPanel() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [langOpen, setLangOpen] = useState(false)

  const currentLang = i18n.language.split('-')[0]

  const selectLanguage = (code: string) => {
    void i18n.changeLanguage(code)
    setLangOpen(false)
  }

  const handleLogin = async () => {
    setLoggingIn(true)
    setError(null)
    try {
      await loginWithPi(dispatch)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login_error', {
              defaultValue: 'Login failed. Please open this app in the Pi Browser.',
            }),
      )
    } finally {
      setLoggingIn(false)
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-white/40 px-6 text-center backdrop-blur-[4px]">
      <img src="/Piketplace.png" alt="Piketplace" className="h-20 w-20 object-contain" />
      <div>
        <h2 className="text-lg font-bold text-primary-dark">{t('login_title', { defaultValue: 'Sign in to continue' })}</h2>
        <p className="mx-auto mt-1 max-w-[260px] text-xs leading-relaxed text-ink-soft">
          {t('login_subtitle', {
            defaultValue:
              'Connect your Pi account to access your orders, sales, messages and more.',
          })}
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogin}
        disabled={loggingIn}
        className="flex w-full max-w-[260px] items-center justify-center gap-2.5 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-dark disabled:opacity-60"
      >
        {loggingIn ? (
          <>
            <Loader2 size={17} className="animate-spin" />
            {t('login_signing_in', { defaultValue: 'Signing in…' })}
          </>
        ) : (
          <>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
              π
            </span>
            {t('login_sign_in', { defaultValue: 'Sign in with Pi' })}
          </>
        )}
      </button>

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setLangOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs font-semibold text-ink shadow-soft transition hover:bg-white"
      >
        <Languages size={15} className="text-primary" />
        {t('side_menu.language', { defaultValue: 'Language' })}
      </button>

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

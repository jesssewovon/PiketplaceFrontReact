import { useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { loginWithPi } from '../lib/auth'
import { useAppDispatch } from '../store/hooks'

export default function LoginPanel() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    </div>
  )
}

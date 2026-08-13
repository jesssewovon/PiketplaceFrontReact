import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Partnership } from '../types'
import { fetchPartnerships } from '../lib/api'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

export default function PartnershipsPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)

  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn) return
    setIsLoading(true)
    setError(null)
    fetchPartnerships(token ?? undefined)
      .then((res) => setPartnerships(res.partnerships ?? []))
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : t('an_error_occured', { defaultValue: 'An error occurred' }),
        ),
      )
      .finally(() => setIsLoading(false))
  }, [isLoggedIn, token, t])

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        {isLoggedIn && !isLoading && (
          <div>
            <h4 className="mb-4 text-base font-bold text-ink">
              {t('our_partnerships', { defaultValue: 'Our partnerships' })}
            </h4>
            {error && partnerships.length === 0 && (
              <p className="rounded-xl bg-red-50 p-3 text-center text-xs font-medium text-red-600">{error}</p>
            )}
            {partnerships.map((p) => (
              <div
                key={p.id ?? p.name ?? p.code ?? p.logo_link ?? ''}
                className="mb-4 border-b border-black/5 pb-4 text-center last:border-b-0"
              >
                <p className="mb-2 text-[11px] font-medium text-ink-soft">{p.name}</p>
                {p.logo_link ? (
                  <img
                    src={p.logo_link}
                    alt={p.name ?? ''}
                    className="mx-auto h-[50px] w-[50px] rounded-full object-cover"
                  />
                ) : null}
                {p.description ? (
                  <p
                    className="mx-auto mt-2 text-[11px] leading-tight text-ink-soft"
                    dangerouslySetInnerHTML={{ __html: p.description }}
                  />
                ) : null}
              </div>
            ))}
            {partnerships.length === 0 && !error && (
              <p className="py-8 text-center text-xs font-medium text-ink-soft">
                {t('empty', { defaultValue: 'Empty' })}
              </p>
            )}
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

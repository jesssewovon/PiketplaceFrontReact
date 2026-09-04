import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AdminSettingItem } from '../../types'
import { fetchAdministration, saveSettings } from '../../lib/api'
import { useAppSelector } from '../../store/hooks'
import LoginPanel from '../../components/LoginPanel'

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export default function AdminSettingsPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)

  const [settings, setSettings] = useState<AdminSettingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadSettings = () => {
    if (!isLoggedIn || !user?.uid) return
    setIsLoading(true)
    fetchAdministration(token ?? undefined, user.uid)
      .then((res) => {
        setSettings(res.settings ?? [])
      })
      .catch(() => {
        setSettings([])
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token, user?.uid])

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      const res = await saveSettings(token ?? undefined, user.id, settings)
      if (res.settings) setSettings(res.settings)
      void Swal.fire({
        icon: res.status === true ? 'success' : 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t(
          res.status === true ? 'saved' : 'an_error_occured',
          res.status === true
            ? { defaultValue: 'Saved' }
            : { defaultValue: 'An error occurred' },
        ),
        confirmButtonColor: '#ec11b5',
      })
    } catch {
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('an_error_occured', { defaultValue: 'An error occurred' }),
        confirmButtonColor: '#ec11b5',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isLoggedIn) {
    return <LoginPanel />
  }

  const editable = settings.filter((setting) => setting.name !== 'balance')

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
          <h4 className="text-base font-bold text-ink">
            {t('admin.settings', { defaultValue: 'Paramètres' })}
          </h4>

          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-xs text-ink-soft">
              <Loader2 size={26} className="animate-spin text-primary" />
              {t('loading', { defaultValue: 'loading' })}
            </div>
          ) : editable.length > 0 ? (
            <>
              <div className="mt-3 space-y-4">
                {editable.map((setting) => {
                  const label = str(setting.description) || str(setting.name) || ''
                  return (
                    <div key={str(setting.id)}>
                      <label className="mb-1 block text-xs font-semibold text-ink">{label}</label>
                      <input
                        type="text"
                        value={str(setting.value)}
                        onChange={(e) => {
                          const next = editable.map((s) =>
                            s.name === setting.name ? { ...s, value: e.target.value } : s,
                          )
                          setSettings([
                            ...settings.filter((s) => s.name === 'balance'),
                            ...next,
                          ])
                        }}
                        placeholder={label}
                        className="h-[40px] w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-sm font-bold uppercase text-white shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={18} className="mx-auto animate-spin" />
                ) : (
                  t('profil.save', { defaultValue: 'Save' })
                )}
              </button>
            </>
          ) : (
            <p className="py-8 text-center text-xs font-medium text-ink-soft">
              {t('no_data', { defaultValue: 'No data' })}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
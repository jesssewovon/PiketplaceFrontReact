import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchPeriods, fetchMyCustomAds, fetchCustomAd, submitCustomAd, updateCustomAd } from '../lib/api'
import type { CustomAdPeriod } from '../types'
import { showAlert } from '../lib/alert'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'
import countriesJson from '../locales/countries.json'

type CountryOption = [string, string]

function buildCountryOptions(raw: unknown): CountryOption[] {
  const list: CountryOption[] = []
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (entry && typeof entry === 'object') {
        const item = entry as Record<string, unknown>
        const code =
          typeof item.code === 'string'
            ? item.code
            : typeof item.iso2 === 'string'
              ? item.iso2
              : null
        const name =
          typeof item.name === 'string'
            ? item.name
            : typeof item.libelle === 'string'
              ? item.libelle
              : null
        if (code && name) list.push([code, name])
      }
    }
  }
  if (list.length > 0) return list
  return countriesJson
    .filter((c) => c.iso2 && c.name)
    .map((c) => [c.iso2, c.name] as CountryOption)
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'

const labelClass = 'mb-1.5 block text-xs font-semibold text-ink-soft'

export default function SubmitCustomAdPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const storedCountries = useAppSelector((state) => state.attributes.countries)

  const editId = id ? Number(id) : null
  const countries = useMemo(() => buildCountryOptions(storedCountries), [storedCountries])

  const [periods, setPeriods] = useState<CustomAdPeriod[]>([])
  const [periodsLoading, setPeriodsLoading] = useState(true)
  const [canCreate, setCanCreate] = useState(true)
  const [loadingAd, setLoadingAd] = useState(editId != null)
  const [periodId, setPeriodId] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isRejected, setIsRejected] = useState(false)
  const [notEditable, setNotEditable] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchPeriods()
      .then((res) => setPeriods(res.periods ?? []))
      .catch(() => setPeriods([]))
      .finally(() => setPeriodsLoading(false))
  }, [])

  useEffect(() => {
    if (editId != null) {
      fetchCustomAd(token ?? undefined, editId)
        .then((res) => {
          const ad = res.ad
          if (!ad) {
            setNotEditable(true)
            return
          }
          if (ad.status !== 'unpaid' && ad.status !== 'rejected') {
            setNotEditable(true)
            return
          }
          setIsRejected(ad.status === 'rejected')
          setPeriodId(ad.period_id != null ? String(ad.period_id) : '')
          setName(ad.name ?? '')
          setUrl(ad.url ?? '')
          setCountryCode(ad.country_code ?? '')
          setImagePreview(ad.image ?? null)
        })
        .catch(() => {
          setNotEditable(true)
        })
        .finally(() => setLoadingAd(false))
      return
    }
    fetchMyCustomAds(token ?? undefined, 1)
      .then((res) => {
        if (typeof res.can_create === 'boolean') setCanCreate(res.can_create)
      })
      .catch(() => undefined)
  }, [editId, token])

  const selectedPeriod = periods.find((p) => p.id === Number(periodId))

  const pickImage = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      void showAlert(
        t('invalid_image', { defaultValue: 'Invalid image' }),
        t('custom_ads.invalid_image_text', { defaultValue: 'Please choose an image file.' }),
        'error',
      )
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const validateForm = (): boolean => {
    if (!periodId) {
      void showAlert(
        t('info', { defaultValue: 'Info' }),
        t('custom_ads.required_period', { defaultValue: 'Please choose a period.' }),
        'error',
      )
      return false
    }
    const trimmedName = name.trim()
    if (!trimmedName) {
      void showAlert(
        t('info', { defaultValue: 'Info' }),
        t('custom_ads.required_name', { defaultValue: 'Please enter a name for your ad.' }),
        'error',
      )
      return false
    }
    if (!countryCode) {
      void showAlert(
        t('info', { defaultValue: 'Info' }),
        t('custom_ads.required_country', { defaultValue: 'Please choose a country.' }),
        'error',
      )
      return false
    }
    if (editId == null && !imageFile) {
      void showAlert(
        t('info', { defaultValue: 'Info' }),
        t('custom_ads.required_image', { defaultValue: 'Please choose an image for your ad.' }),
        'error',
      )
      return false
    }
    return true
  }

  const submit = async () => {
    if (!validateForm() || !imageFile) return
    setSubmitting(true)
    try {
      const period_id = selectedPeriod?.id ?? Number(periodId)
      const res = await submitCustomAd(token ?? undefined, {
        period_id,
        name: name.trim(),
        url: url.trim() || undefined,
        country_code: countryCode,
        image: imageFile,
      })
      if (res.status === true) {
        void showAlert(
          t('custom_ads.submitted', { defaultValue: 'Submitted' }),
          t('custom_ads.created_pay_later_text', {
            defaultValue: 'Your ad has been created. Pay for it from your ads page so it can be reviewed.',
          }),
          'success',
        )
        navigate('/my-ads')
      } else {
        void showAlert(
          t('error', { defaultValue: 'Error' }),
          res.message ?? t('an_error_occured', { defaultValue: 'An error occurred' }),
          'error',
        )
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('an_error_occured', { defaultValue: 'An error occurred' })
      void showAlert(t('error', { defaultValue: 'Error' }), message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const save = async () => {
    if (!validateForm() || editId == null) return
    setSubmitting(true)
    try {
      const period_id = selectedPeriod?.id ?? Number(periodId)
      const res = await updateCustomAd(token ?? undefined, editId, {
        period_id,
        name: name.trim(),
        url: url.trim() || undefined,
        country_code: countryCode,
        image: imageFile ?? undefined,
      })
      if (res.status === true) {
        void showAlert(
          t('custom_ads.updated', { defaultValue: 'Updated' }),
          res.message ??
            t('custom_ads.updated_text', { defaultValue: 'Your ad has been updated.' }),
          'success',
        )
        navigate('/my-ads')
      } else {
        void showAlert(
          t('error', { defaultValue: 'Error' }),
          res.message ?? t('an_error_occured', { defaultValue: 'An error occurred' }),
          'error',
        )
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('an_error_occured', { defaultValue: 'An error occurred' })
      void showAlert(t('error', { defaultValue: 'Error' }), message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isLoggedIn) return <LoginPanel />

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <button
          type="button"
          onClick={() => navigate('/my-ads')}
          className="mb-2 flex items-center gap-1 text-xs font-semibold text-ink-soft transition hover:text-primary"
        >
          <ArrowLeft size={14} />
          {t('back_to_my_ads', { defaultValue: 'Back to my ads' })}
        </button>

        {editId != null && loadingAd ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : notEditable ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm font-medium text-ink-soft">
              {t('custom_ads.not_editable', {
                defaultValue: 'This ad cannot be edited anymore.',
              })}
            </p>
            <button
              type="button"
              onClick={() => navigate('/my-ads')}
              className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
            >
              {t('back_to_my_ads', { defaultValue: 'Back to my ads' })}
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-primary-dark">
              {editId != null
                ? t('custom_ads.edit_title', { defaultValue: 'Edit your ad' })
                : t('custom_ads.submit_title', { defaultValue: 'Submit an ad' })}
            </h1>
            <p className="mt-1 text-xs text-ink-soft">
              {editId != null
                ? isRejected
                  ? t('custom_ads.edit_rejected_subtitle', {
                      defaultValue: 'Fix the ad below and save to resubmit it. The period cannot be changed.',
                    })
                  : t('custom_ads.edit_subtitle', {
                      defaultValue: 'Update the information of your ad below.',
                    })
                : t('custom_ads.submit_subtitle', {
                    defaultValue: 'Fill in the information below. You will pay for your ad afterwards.',
                  })}
            </p>

            {editId == null && !canCreate && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
                {t('custom_ads.create_blocked', {
                  defaultValue:
                    'You can only create a new ad when your latest ad is paid and approved. Pay, wait for the review, or delete your unpaid ad first.',
                })}
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label className={labelClass}>
                  {t('custom_ads.period', { defaultValue: 'Period' })} *
                </label>
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  className={inputClass}
                  disabled={periodsLoading || (editId != null && isRejected)}
                >
                  <option value="">
                    {periodsLoading
                      ? t('loading', { defaultValue: 'loading' })
                      : t('custom_ads.choose_period', { defaultValue: 'Choose a period' })}
                  </option>
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.type}
                      {period.period ? ` - ${period.period}` : ''}
                      {period.amount != null ? ` (${period.amount} π)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPeriod && Number(selectedPeriod.amount ?? 0) > 0 && (
                <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <span className="text-xs font-semibold text-primary">
                    {t('custom_ads.amount_to_pay', { defaultValue: 'Amount to pay' })}
                  </span>
                  <span className="text-sm font-bold text-primary">π {selectedPeriod.amount}</span>
                </div>
              )}

              <div>
                <label className={labelClass}>{t('custom_ads.name', { defaultValue: 'Name' })} *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  placeholder={t('custom_ads.name_placeholder', { defaultValue: 'Your ad name' })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t('custom_ads.url', { defaultValue: 'URL' })}
                  <span className="font-normal text-slate-400">
                    {' '}
                    ({t('custom_ads.optional', { defaultValue: 'optional' })})
                  </span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  maxLength={500}
                  placeholder={t('custom_ads.url_placeholder', { defaultValue: 'https://...' })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t('custom_ads.country', { defaultValue: 'Country' })} *
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className={inputClass}
                >
                  <option value="">
                    {t('custom_ads.choose_country', { defaultValue: 'Choose a country' })}
                  </option>
                  {countries.map(([code, countryName]) => (
                    <option key={code} value={code}>
                      {countryName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  {t('custom_ads.image', { defaultValue: 'Image' })} *{editId != null && (
                    <span className="font-normal text-slate-400">
                      {' '}
                      ({t('custom_ads.optional', { defaultValue: 'optional' })})
                    </span>
                  )}
                </label>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
                  }}
                  className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-mist/40 text-xs font-medium text-ink-soft transition hover:border-primary hover:bg-primary/5"
                >
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt={t('custom_ads.preview', { defaultValue: 'Preview' })}
                        className="h-28 w-full rounded-xl object-contain"
                      />
                      <span className="flex items-center gap-1">
                        <ImagePlus size={14} />
                        {t('custom_ads.change_image', { defaultValue: 'Change image' })}
                      </span>
                    </>
                  ) : (
                    <>
                      <ImagePlus size={28} className="text-primary" />
                      {t('custom_ads.tap_to_choose', { defaultValue: 'Tap to choose an image' })}
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickImage(e.target.files?.[0])}
                />
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null)
                      setImageFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-500"
                  >
                    <X size={14} />
                    {t('custom_ads.remove_image', { defaultValue: 'Remove image' })}
                  </button>
                )}
              </div>

              {editId != null ? (
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={submitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3.5 text-sm font-bold text-white shadow-soft transition-all duration-300 hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  {submitting
                    ? t('saving', { defaultValue: 'Saving...' })
                    : isRejected
                      ? t('custom_ads.save_and_resubmit', { defaultValue: 'Save and resubmit' })
                      : t('custom_ads.save_changes', { defaultValue: 'Save changes' })}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={submitting || !canCreate || !imageFile}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3.5 text-sm font-bold text-white shadow-soft transition-all duration-300 hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  {submitting
                    ? t('custom_ads.submitting', { defaultValue: 'Submitting...' })
                    : t('custom_ads.create_ad', { defaultValue: 'Create ad' })}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
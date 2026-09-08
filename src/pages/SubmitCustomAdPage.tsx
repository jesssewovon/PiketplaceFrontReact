import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchPeriods, fetchMyCustomAds, fetchCustomAd, submitCustomAd, updateCustomAd } from '../lib/api'
import type { CustomAdPeriod } from '../types'
import { getPeriodLabel } from '../lib/format'
import { showAlert } from '../lib/alert'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'
import { periodsStore } from '../lib/customAdsStore'
import { getStoredCountryCode, getCountryCode } from '../lib/geo'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'

const labelClass = 'mb-1.5 block text-xs font-semibold text-ink-soft'

export default function SubmitCustomAdPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const editId = id ? Number(id) : null

  const [periods, setPeriods] = useState<CustomAdPeriod[]>(periodsStore.periods)
  const [periodsLoading, setPeriodsLoading] = useState(!periodsStore.loaded)
  const [canCreate, setCanCreate] = useState(true)
  const [loadingAd, setLoadingAd] = useState(editId != null)
  const [periodId, setPeriodId] = useState('')
  const [name, setName] = useState('')
  const [countryCode, setCountryCode] = useState(() => getStoredCountryCode() ?? getCountryCode())

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isRejected, setIsRejected] = useState(false)
  const [notEditable, setNotEditable] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (periodsStore.loaded) return
    fetchPeriods()
      .then((res) => {
        const list = res.periods ?? []
        periodsStore.periods = list
        periodsStore.loaded = true
        setPeriods(list)
      })
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
          if (ad.status !== 'rejected' && ad.paid_at !== null) {
            setNotEditable(true)
            return
          }
          setIsRejected(ad.status === 'rejected')
          setPeriodId(ad.period_id != null ? String(ad.period_id) : '')
          setName(ad.name ?? '')
          if (ad.country_code) setCountryCode(ad.country_code)
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
        if (typeof res.can_create === 'boolean') {
          setCanCreate(res.can_create)
          return
        }
        const blocked = (res.ads?.data ?? []).some(
          (a) => a.paid_at === null || a.status === 'pending' || a.status === 'rejected',
        )
        setCanCreate(!blocked)
      })
      .catch(() => undefined)
  }, [editId, token])

  const selectedPeriod = periods.find((p) => p.id === Number(periodId))
  const formDisabled = editId == null && !canCreate

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
    if (editId == null && !canCreate) {
      void showAlert(
        t('error', { defaultValue: 'Error' }),
        t('custom_ads.create_blocked', {
          defaultValue:
            'You can only create a new ad when your latest ad is paid and approved. Pay, wait for the review, or delete your unpaid ad first.',
        }),
        'error',
      )
      return
    }
    if (!validateForm() || !imageFile) return
    if (!acceptedTerms) {
      void showAlert(
        t('info', { defaultValue: 'Info' }),
        t('custom_ads.accept_terms_required', {
          defaultValue: 'Please accept the ad terms and conditions before creating your ad.',
        }),
        'error',
      )
      return
    }
    setSubmitting(true)
    try {
      const period_id = selectedPeriod?.id ?? Number(periodId)
      const res = await submitCustomAd(token ?? undefined, {
        period_id,
        name: name.trim(),
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
    if (!acceptedTerms) {
      void showAlert(
        t('info', { defaultValue: 'Info' }),
        t('custom_ads.accept_terms_required', {
          defaultValue: 'Please accept the ad terms and conditions before creating your ad.',
        }),
        'error',
      )
      return
    }
    setSubmitting(true)
    try {
      const period_id = selectedPeriod?.id ?? Number(periodId)
      const res = await updateCustomAd(token ?? undefined, editId, {
        period_id,
        name: name.trim(),
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
        {/* <button
          type="button"
          onClick={() => navigate('/my-ads')}
          className="mb-2 flex items-center gap-1 text-xs font-semibold text-ink-soft transition hover:text-primary"
        >
          <ArrowLeft size={14} />
          {t('back_to_my_ads', { defaultValue: 'Back to my ads' })}
        </button> */}

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
            {/* <button
              type="button"
              onClick={() => navigate('/my-ads')}
              className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
            >
              {t('back_to_my_ads', { defaultValue: 'Back to my ads' })}
            </button> */}
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

            {formDisabled && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
                {t('custom_ads.pending_ad_blocked', {
                  defaultValue:
                    'The form is disabled. You already have a pending ad. You can only create a new ad once your latest ad is paid and approved.',
                })}
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label className={labelClass}>
                  {t('period', { defaultValue: 'Period' })} *
                </label>
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  className={inputClass}
                  disabled={formDisabled || periodsLoading || (editId != null && isRejected)}
                >
                  <option value="">
                    {periodsLoading
                      ? t('loading', { defaultValue: 'loading' })
                      : t('custom_ads.choose_period', { defaultValue: 'Choose a period' })}
                  </option>
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {getPeriodLabel(period, t)}
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
                  disabled={formDisabled}
                  placeholder={t('custom_ads.name_placeholder', { defaultValue: 'Your ad name' })}
                  className={inputClass}
                />
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
                <p className="-mt-1 mb-2 text-[11px] text-ink-soft">
                  {t('custom_ads.image_size_hint', {
                    defaultValue: 'JPG, PNG, GIF or WEBP — max 5 MB, recommended 1280×768',
                  })}
                </p>
                <div
                  role="button"
                  tabIndex={formDisabled ? -1 : 0}
                  onClick={() => {
                    if (!formDisabled) fileInputRef.current?.click()
                  }}
                  onKeyDown={(e) => {
                    if (!formDisabled && (e.key === 'Enter' || e.key === ' '))
                      fileInputRef.current?.click()
                  }}
                  className={`flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-mist/40 text-xs font-medium text-ink-soft transition hover:border-primary hover:bg-primary/5 ${
                    formDisabled ? 'cursor-not-allowed opacity-50 hover:border-primary/30 hover:bg-mist/40' : ''
                  }`}
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
                {imagePreview && !formDisabled && (
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

              <div className={`mt-4 space-y-2 ${formDisabled ? 'pointer-events-none opacity-50' : ''}`}>
                <Link
                  to="/ad-terms"
                  className="text-xs font-semibold text-primary underline underline-offset-2"
                >
                  {t('custom_ads.accept_terms_title', { defaultValue: 'Ad terms and conditions' })}
                </Link>
                <label
                  htmlFor="custom_ad_terms"
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-3"
                >
                  <span className="text-xs font-semibold text-ink-soft">
                    {t('custom_ads.accept_terms_title', {
                      defaultValue: 'Ad terms and conditions',
                    })}
                    <span className="block text-[10px] font-normal text-slate-400">
                      {t('custom_ads.accept_terms_text', {
                        defaultValue: 'I accept the ad terms and conditions',
                      })}
                    </span>
                  </span>
                  <input
                    id="custom_ad_terms"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                </label>
              </div>

              {editId != null ? (
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={submitting || !acceptedTerms}
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
                  disabled={submitting || !canCreate || !imageFile || !acceptedTerms}
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
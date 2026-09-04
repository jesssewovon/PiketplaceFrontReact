import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchCitiesByCountry } from '../lib/api'

export interface ShippingZone {
  country_code: string
  country_name: string
  city: string
  fee?: string
}

export type CountryOption = [string, string]

interface ShippingZoneFormProps {
  open: boolean
  countries: CountryOption[]
  piRate: number
  feeEnabled?: boolean
  onSave: (zone: ShippingZone) => void
  onCancel: () => void
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'

const labelClass = 'mb-1.5 block text-xs font-semibold text-ink-soft'

export default function ShippingZoneForm({
  open,
  countries,
  piRate,
  feeEnabled = true,
  onSave,
  onCancel,
}: ShippingZoneFormProps) {
  const { t } = useTranslation()
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [fee, setFee] = useState('')
  const [cities, setCities] = useState<string[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [citiesError, setCitiesError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!country) {
      setCities([])
      setCitiesError(null)
      setCity('')
      return
    }
    let cancelled = false
    setCitiesLoading(true)
    setCitiesError(null)
    setCity('')
    fetchCitiesByCountry(country)
      .then((list) => {
        if (!cancelled) setCities(list)
      })
      .catch((err) => {
        if (!cancelled) {
          setCitiesError(
            err instanceof Error ? err.message : t('shipping_zone_cities_error', { defaultValue: "Couldn't load cities" }),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [country, t])

  if (!open) return null

  const feeNum = Number(fee)
  const piAmount =
    piRate > 0 && Number.isFinite(feeNum) && feeNum > 0 ? feeNum / piRate : null

  const handleSave = () => {
    setError(null)
    const selected = countries.find(([code]) => code === country)
    if (!country || !selected) {
      setError(t('shipping zone country required', { defaultValue: 'Please select a country for the zone.' }))
      return
    }
    if (!city.trim()) {
      setError(t('shipping zone city required', { defaultValue: 'Please enter a city for the zone.' }))
      return
    }
    if (feeEnabled && (!fee || Number(fee) <= 0)) {
      setError(t('shipping zone fee required', { defaultValue: 'Please enter a valid shipping fee.' }))
      return
    }
    onSave({
      country_code: country,
      country_name: selected[1],
      city: city.trim(),
      ...(feeEnabled ? { fee } : {}),
    })
    setCountry('')
    setCity('')
    setFee('')
  }

  const showCityInput = !citiesLoading && !citiesError && cities.length === 0

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary-dark">
            {t('add zone', { defaultValue: 'Add a shipping zone' })}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto">
          <div>
            <label className={labelClass}>
              {t('address.country', { defaultValue: 'Country' })}
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                {t('select_country', { defaultValue: 'Select a country…' })}
              </option>
              {countries.map(([code, name]) => (
                <option key={code} value={code}>
                  {code === 'Other'
                    ? t('publish_other', { defaultValue: 'Other' })
                    : name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              {t('address.city', { defaultValue: 'City' })}
            </label>
            {citiesLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-xs font-semibold text-ink-soft">
                <Loader2 size={14} className="animate-spin text-primary" />
                {t('loading', { defaultValue: 'Loading cities…' })}
              </div>
            ) : cities.length > 0 ? (
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  {t('select_city', { defaultValue: 'Select a city…' })}
                </option>
                {cities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                maxLength={120}
                placeholder={t('select_city', { defaultValue: 'Type a city' })}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              />
            )}
            {citiesError && showCityInput && (
              <p className="mt-1.5 text-[10px] text-slate-400">{citiesError}</p>
            )}
          </div>

          {feeEnabled && (
            <div>
              <label className={labelClass}>
                {t('shipping_zone_fee', { defaultValue: 'Fee (USD)' })}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className={`${inputClass} pl-8 pr-28`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary">
                  {piAmount != null
                    ? `${t('publish_approx', { defaultValue: '≈' })} ${piAmount.toFixed(2)} π`
                    : '0.00 π'}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-2.5 text-xs font-bold text-white shadow-soft transition hover:shadow-hover"
            >
              {t('profilForm.save', { defaultValue: 'Save' })}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-ink-soft transition hover:bg-slate-50"
            >
              {t('cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

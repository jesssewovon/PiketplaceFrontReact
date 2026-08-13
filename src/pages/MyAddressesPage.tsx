import { useCallback, useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ShippingAddress } from '../types'
import { deleteAddress, fetchCitiesByCountry, fetchMyAddresses, saveAddress, setAddressAsDefault } from '../lib/api'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'
import countriesJson from '../locales/countries.json'

type CountryOption = [string, string]

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'

const labelClass = 'mb-1.5 block text-xs font-semibold text-ink-soft'

function buildCountryOptions(raw: unknown): CountryOption[] {
  const list: CountryOption[] = []
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (entry && typeof entry === 'object') {
        const item = entry as Record<string, unknown>
        const code = typeof item.code === 'string' ? item.code : typeof item.iso2 === 'string' ? item.iso2 : null
        const name =
          typeof item.name === 'string'
            ? item.name
            : typeof item.translations === 'object' && item.translations !== null
              ? ((item.translations as Record<string, unknown>).en as string) ?? null
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

export default function MyAddressesPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const storedCountries = useAppSelector((state) => state.attributes.countries)
  const countries = useMemo(() => buildCountryOptions(storedCountries), [storedCountries])

  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  const emptyForm: ShippingAddress = {
    name: '',
    country_code: '',
    country_name: '',
    city: '',
    address: '',
    phone_code: '+',
    phone_number: '',
    email: '',
    is_default: false,
  }
  const [form, setForm] = useState<ShippingAddress>(emptyForm)
  const [cities, setCities] = useState<string[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [citiesError, setCitiesError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadAddresses = useCallback(() => {
    setIsLoading(true)
    fetchMyAddresses(token ?? undefined)
      .then((res) => setAddresses(res.addresses ?? []))
      .catch(() => {
        void Swal.fire({
          icon: 'error',
          title: t('info', { defaultValue: 'Info' }),
          text: t('an_error_occured', { defaultValue: 'An error occurred' }),
          confirmButtonColor: '#ec11b5',
        })
      })
      .finally(() => setIsLoading(false))
  }, [token, t])

  useEffect(() => {
    if (!isLoggedIn) return
    loadAddresses()
  }, [isLoggedIn, loadAddresses])

  useEffect(() => {
    if (!form.country_code) {
      setCities([])
      setCitiesError(null)
      return
    }
    let cancelled = false
    setCitiesLoading(true)
    setCitiesError(null)
    fetchCitiesByCountry(form.country_code)
      .then((list) => {
        if (!cancelled) setCities(list)
      })
      .catch((err) => {
        if (!cancelled) setCitiesError(err instanceof Error ? err.message : '')
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [form.country_code])

  const updateField = (field: keyof ShippingAddress, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const selectCountry = (code: string) => {
    const country = countries.find(([c]) => c === code)
    if (!country) return
    const jsonCountry = countriesJson.find((c) => c.iso2 === code)
    setForm((prev) => ({
      ...prev,
      country_code: code,
      country_name: country[1],
      city: '',
      phone_code: jsonCountry?.phone_code
        ? (jsonCountry.phone_code.startsWith('+') ? jsonCountry.phone_code : `+${jsonCountry.phone_code}`)
        : prev.phone_code,
    }))
  }

  const handleSave = () => {
    if (
      !form.country_name ||
      !form.city ||
      !form.address ||
      !form.phone_code ||
      !form.phone_number ||
      !form.email
    ) {
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('fill_all_fields', { defaultValue: 'Please fill all fields' }),
        confirmButtonColor: '#ec11b5',
      })
      return
    }
    setIsSaving(true)
    saveAddress(token ?? undefined, form)
      .then((res) => {
        setIsSaving(false)
        if (res.status === true) {
          setAddresses(res.addresses ?? [])
          setForm(emptyForm)
          setFormOpen(false)
          void Swal.fire({
            icon: 'success',
            title: t('info', { defaultValue: 'Info' }),
            text: t('saved', { defaultValue: 'Saved' }),
            confirmButtonColor: '#ec11b5',
          })
        } else {
          void Swal.fire({
            icon: 'error',
            title: t('info', { defaultValue: 'Info' }),
            text: t('an_error_occured', { defaultValue: 'An error occurred' }),
            confirmButtonColor: '#ec11b5',
          })
        }
      })
      .catch(() => {
        setIsSaving(false)
        void Swal.fire({
          icon: 'error',
          title: t('info', { defaultValue: 'Info' }),
          text: t('an_error_occured', { defaultValue: 'An error occurred' }),
          confirmButtonColor: '#ec11b5',
        })
      })
  }

  const confirmDelete = (originalIndex: number) => {
    void Swal.fire({
      title: t('set_as_default', { defaultValue: 'Set as default' }),
      html: `<img class="m-auto" src="/site_images/confirm.PNG" alt=""><br><strong style="font-size:20px;">${t('you_sure', {
        defaultValue: 'Are you sure?',
      })}</strong>`,
      showCancelButton: true,
      confirmButtonColor: '#ec11b5',
      confirmButtonText: t('yes', { defaultValue: 'Yes' }),
      cancelButtonText: t('no', { defaultValue: 'No' }),
    }).then((result) => {
      if (result.isConfirmed) {
        deleteAddress(token ?? undefined, originalIndex)
          .then((res) => {
            if (res.status === true) {
              setAddresses(res.addresses ?? [])
              void Swal.fire({
                icon: 'info',
                title: t('info', { defaultValue: 'Info' }),
                text: t('deleted_successfull', { defaultValue: 'Deleted successfully' }),
                confirmButtonColor: '#ec11b5',
              })
            } else {
              void Swal.fire({
                icon: 'error',
                title: t('info', { defaultValue: 'Info' }),
                text: t('an_error_occured', { defaultValue: 'An error occurred' }),
                confirmButtonColor: '#ec11b5',
              })
            }
          })
          .catch(() => {
            void Swal.fire({
              icon: 'error',
              title: t('info', { defaultValue: 'Info' }),
              text: t('an_error_occured', { defaultValue: 'An error occurred' }),
              confirmButtonColor: '#ec11b5',
            })
          })
      }
    })
  }

  const confirmSetDefault = (originalIndex: number) => {
    void Swal.fire({
      title: t('set_as_default', { defaultValue: 'Set as default' }),
      html: `<img class="m-auto" src="/site_images/confirm.PNG" alt=""><br><strong style="font-size:20px;">${t('you_sure', {
        defaultValue: 'Are you sure?',
      })}</strong>`,
      showCancelButton: true,
      confirmButtonColor: '#ec11b5',
      confirmButtonText: t('yes', { defaultValue: 'Yes' }),
      cancelButtonText: t('no', { defaultValue: 'No' }),
    }).then((result) => {
      if (result.isConfirmed) {
        setAddressAsDefault(token ?? undefined, originalIndex)
          .then((res) => {
            if (res.status === true) {
              setAddresses(res.addresses ?? [])
              void Swal.fire({
                icon: 'info',
                title: t('info', { defaultValue: 'Info' }),
                text: t('saved', { defaultValue: 'Saved' }),
                confirmButtonColor: '#ec11b5',
              })
            } else {
              void Swal.fire({
                icon: 'error',
                title: t('info', { defaultValue: 'Info' }),
                text: t('an_error_occured', { defaultValue: 'An error occurred' }),
                confirmButtonColor: '#ec11b5',
              })
            }
          })
          .catch(() => {
            void Swal.fire({
              icon: 'error',
              title: t('info', { defaultValue: 'Info' }),
              text: t('an_error_occured', { defaultValue: 'An error occurred' }),
              confirmButtonColor: '#ec11b5',
            })
          })
      }
    })
  }

  const reversed = [...addresses].reverse()

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        {isLoggedIn && !isLoading && (
          <>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary-deep text-white shadow-soft transition hover:opacity-90"
              aria-label={t('address.new_address', { defaultValue: 'New address' })}
            >
              <Plus size={16} />
            </button>

            {reversed.length > 0 ? (
              <div className="mt-4 space-y-3">
                {reversed.map((address, i) => {
                  const originalIndex = addresses.length - 1 - i
                  return (
                    <div
                      key={originalIndex}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-soft"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5 text-xs text-ink">
                        {address.country_name && address.city && (
                          <p className="font-semibold">
                            {address.city}-{address.country_name}
                          </p>
                        )}
                        {address.address && <p>{address.address}</p>}
                        {address.phone_number && <p>{address.phone_number}</p>}
                        {address.email && <p>{address.email}</p>}
                        <p className="pt-1">
                          {address.is_default === undefined || address.is_default === false ? (
                            <button
                              type="button"
                              onClick={() => confirmSetDefault(originalIndex)}
                              className="rounded-lg bg-gradient-to-r from-primary to-primary-deep px-2 py-1 text-[10px] font-bold text-white"
                            >
                              {t('set_as_default', { defaultValue: 'Set as default' })}
                            </button>
                          ) : (
                            <span className="font-bold text-primary">
                              {t('default_address', { defaultValue: 'Default address' })}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => confirmDelete(originalIndex)}
                        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-primary transition hover:opacity-70"
                        aria-label={t('delete', { defaultValue: 'Delete' })}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              !isLoading && (
                <p className="py-10 text-center text-xs font-medium text-ink-soft">
                  {t('empty', { defaultValue: 'Empty' })}
                </p>
              )
            )}
          </>
        )}

        {isLoggedIn && isLoading && (
          <div className="flex flex-col items-center gap-2 py-12 text-xs text-ink-soft">
            <Loader2 size={26} className="animate-spin text-primary" />
            {t('loading', { defaultValue: 'loading' })}
          </div>
        )}

        {!isLoggedIn && <LoginPanel />}
      </section>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-primary">
                  {t('address.new_address', { defaultValue: 'New address' })}
                </p>
                <h3 className="text-lg font-bold text-ink">
                  {t('address.address', { defaultValue: 'Address' })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto">
              <div>
                <label className={labelClass}>
                  {t('address.name', { defaultValue: 'Name' })}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t('select_country', { defaultValue: 'Select country' })}
                </label>
                <select
                  value={form.country_code ?? ''}
                  onChange={(e) => selectCountry(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {t('select_country', { defaultValue: 'Select country' })}
                  </option>
                  {countries.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  {t('select_city', { defaultValue: 'Select city' })}
                </label>
                {citiesLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-xs font-semibold text-ink-soft">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    {t('loading', { defaultValue: 'loading' })}
                  </div>
                ) : cities.length > 0 ? (
                  <select
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      {t('select_city', { defaultValue: 'Select city' })}
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
                    value={form.city}
                    placeholder={t('select_city', { defaultValue: 'Select city' })}
                    onChange={(e) => updateField('city', e.target.value)}
                    className={inputClass}
                  />
                )}
                {citiesError && (
                  <p className="mt-1.5 text-[10px] text-slate-400">{citiesError}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  {t('address.street_address', { defaultValue: 'Street address' })}
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex gap-2">
                <div className="w-[30%]">
                  <label className={labelClass}>
                    {t('address.phone_code', { defaultValue: 'Phone code' })}
                  </label>
                  <input
                    type="text"
                    value={form.phone_code}
                    onChange={(e) => updateField('phone_code', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="w-[70%]">
                  <label className={labelClass}>
                    {t('address.phone_number', { defaultValue: 'Phone number' })}
                  </label>
                  <input
                    type="text"
                    value={form.phone_number}
                    onChange={(e) => updateField('phone_number', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {t('profilForm.email', { defaultValue: 'E-mail' })}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={inputClass}
                />
              </div>

              <label className="flex items-center gap-2.5 pt-1 text-xs font-medium text-ink">
                <input
                  type="checkbox"
                  checked={form.is_default === true}
                  onChange={(e) => updateField('is_default', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#ec11b5]"
                />
                {t('set_as_default', { defaultValue: 'Set as default' })}
              </label>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-xs font-bold text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
              >
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {t('add', { defaultValue: 'Add' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

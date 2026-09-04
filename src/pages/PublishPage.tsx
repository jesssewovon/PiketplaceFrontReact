import { useMemo, useRef, useState, useEffect, type ChangeEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  ImagePlus,
  Loader2,
  CheckCircle2,
  X,
  AlertCircle,
  Check,
  Plus,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  createProduct,
  updateProduct,
  fetchCategories,
  fetchCitiesByCountry,
  fetchProduct,
  type ProductCategory,
} from '../lib/api'
import type { Product, ProductShippingZone } from '../types'
import { showAlert } from '../lib/alert'
import { useAppSelector } from '../store/hooks'
import ShippingZoneForm, { type ShippingZone, type CountryOption } from '../components/ShippingZoneForm'

const FALLBACK_COUNTRIES = [
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['FR', 'France'],
  ['DE', 'Germany'],
  ['CA', 'Canada'],
  ['NG', 'Nigeria'],
  ['GH', 'Ghana'],
  ['KE', 'Kenya'],
  ['ZA', 'South Africa'],
  ['IN', 'India'],
  ['PH', 'Philippines'],
  ['ID', 'Indonesia'],
  ['CN', 'China'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['AU', 'Australia'],
  ['IT', 'Italy'],
  ['ES', 'Spain'],
  ['NL', 'Netherlands'],
  ['BE', 'Belgium'],
  ['CH', 'Switzerland'],
  ['AT', 'Austria'],
  ['Other', 'Other'],
] as const

function normalizeCountries(raw: unknown): CountryOption[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((entry): CountryOption | null => {
        if (entry && typeof entry === 'object') {
          const item = entry as Record<string, unknown>
          const code = typeof item.code === 'string' ? item.code : null
          const name =
            typeof item.name === 'string'
              ? item.name
              : typeof item.libelle === 'string'
                ? item.libelle
                : null
          if (code && name) return [code.toUpperCase(), name]
        }
        return null
      })
      .filter((entry): entry is CountryOption => entry !== null)
  }
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([key, entry]): CountryOption | null => {
        if (entry && typeof entry === 'object') {
          const item = entry as Record<string, unknown>
          const code = typeof item.code === 'string' ? item.code : key
          const name = typeof item.name === 'string' ? item.name : null
          if (name) return [code.toUpperCase(), name]
        }
        return null
      })
      .filter((entry): entry is CountryOption => entry !== null)
  }
  return []
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'

const labelClass = 'mb-1.5 block text-xs font-semibold text-ink-soft'

interface FormState {
  category_selected_id: string
  libelle: string
  is_digital: boolean
  price: string
  quantity: string
  description: string
  country_code: string
  city: string
  address: string
  email: string
  shipping_zone: ShippingZone[]
  free_shipping: boolean
  free_shipping_zone: ShippingZone[]
  promotion_fees_activated: boolean
  promotion_fees_percentage: string
  product_available: boolean
  saling_terms_agreements: boolean
}

const initialState: FormState = {
  category_selected_id: '',
  libelle: '',
  is_digital: false,
  price: '',
  quantity: '1',
  description: '',
  country_code: '',
  city: '',
  address: '',
  email: '',
  shipping_zone: [],
  free_shipping: false,
  free_shipping_zone: [],
  promotion_fees_activated: false,
  promotion_fees_percentage: "0.05",
  product_available: true,
  saling_terms_agreements: false,
}

interface PhotoItem {
  preview: string
  file?: File
  ref?: string
}

export default function PublishPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { productId } = useParams<{ productId: string }>()
  const productIdNum = productId ? Number(productId) : null
  const isEdit = productIdNum != null && Number.isFinite(productIdNum) && productIdNum > 0

  const [form, setForm] = useState<FormState>(initialState)
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [categoryOpen, setCategoryOpen] = useState(false)

  const [zoneOpen, setZoneOpen] = useState(false)
  const [freeZoneOpen, setFreeZoneOpen] = useState(false)

  const [cities, setCities] = useState<string[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [citiesError, setCitiesError] = useState<string | null>(null)
  const skipCityReset = useRef(isEdit)

  useEffect(() => {
    if (!form.country_code || form.country_code === 'Other') {
      setCities([])
      setCitiesError(null)
      return
    }
    if (skipCityReset.current) {
      skipCityReset.current = false
    } else {
      setForm((prev) => ({ ...prev, city: '' }))
    }
    let cancelled = false
    setCitiesLoading(true)
    setCitiesError(null)
    fetchCitiesByCountry(form.country_code)
      .then((list) => {
        if (!cancelled) setCities(list)
      })
      .catch((err) => {
        if (!cancelled) {
          setCitiesError(
            err instanceof Error ? err.message : t('publish_cities_error', { defaultValue: "Couldn't load cities" }),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [form.country_code, t])

  const authToken = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)

  const maxFiles = useAppSelector((state) => {
    const value = state.settings.settings?.nb_files_product
    const nb = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(nb) && nb > 0 ? nb : 4
  })

  const mapZone = (zone: ProductShippingZone): ShippingZone => ({
    country_code: String(zone.country_code ?? ''),
    country_name: String(zone.country_name ?? ''),
    city: String(zone.city ?? ''),
    fee:
      zone.fee != null || zone.fee_amount != null
        ? String(zone.fee ?? zone.fee_amount)
        : undefined,
  })

  const prefillProduct = (product: Product) => {
    setForm({
      category_selected_id: product.category?.id != null ? String(product.category.id) : '',
      libelle: product.libelle ?? '',
      is_digital: Boolean(product.is_digital),
      price: String(product.price_str ?? product.price ?? ''),
      quantity: String(product.quantity ?? 1),
      description: product.description ?? '',
      country_code: product.country_code ?? '',
      city: product.city ?? '',
      address: product.address ?? '',
      email: product.email ?? '',
      shipping_zone: (product.shipping_zone ?? []).map(mapZone),
      free_shipping: Boolean(product.free_shipping),
      free_shipping_zone: (product.free_shipping_zone ?? []).map(mapZone),
      promotion_fees_activated: Boolean(product.promotion_fees_activated),
      promotion_fees_percentage:
        product.promotion_fees_percentage != null ? String(product.promotion_fees_percentage) : '',
      product_available: Boolean(product.visible ?? true),
      saling_terms_agreements: true,
    })
    setPhotoItems((product.images ?? []).map((img) => ({ preview: img.lien, ref: img.lien })))
    fetchCategories()
      .then((list) => {
        if (list.length > 0) setCategories(list)
      })
      .catch(() => {
        // categories can be loaded later from the category picker
      })
  }

  useEffect(() => {
    if (!isEdit || !productIdNum) return
    let cancelled = false
    setLoadingProduct(true)
    setLoadError(null)
    fetchProduct(productIdNum, authToken ?? undefined)
      .then((data) => {
        if (cancelled) return
        if (!data.product) {
          setLoadError(t('product_not_found', { defaultValue: 'Product not found' }))
          return
        }
        prefillProduct(data.product)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : t('publish_error', { defaultValue: "Couldn't load product" }))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProduct(false)
      })
    return () => {
      cancelled = true
    }
  }, [isEdit, productIdNum, authToken, t])

  useEffect(() => {
    if (!isEdit && user?.email && form.email === '') {
      setForm((prev) => ({ ...prev, email: user!.email! }))
    }
  }, [isEdit, user?.email, form.email])

  const piRate = useAppSelector((state) => {
    const value = state.settings.settings?.piUSDTValue
    const num = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : 0
    return Number.isFinite(num) && num > 0 ? num : 0
  })

  const storedCountries = useAppSelector((state) => state.attributes.countries)
  const countries = useMemo(() => {
    const normalized = normalizeCountries(storedCountries)
    return normalized.length > 0 ? normalized : (FALLBACK_COUNTRIES as unknown as CountryOption[])
  }, [storedCountries])
  const selectedCountryExists = countries.some(([code]) => code === form.country_code)

  const selectedCategory = categories.find(
    (c) => String(c.id) === form.category_selected_id,
  )

  const priceNum = Number(form.price)
  const piAmount =
    piRate > 0 && Number.isFinite(priceNum) && priceNum > 0 ? priceNum / piRate : null

  const updateField = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const openCategoryPicker = async () => {
    setCategoryOpen(true)
    if (categories.length > 0) return
    setCategoriesLoading(true)
    setCategoriesError(null)
    try {
      setCategories(await fetchCategories())
    } catch (err) {
      setCategoriesError(
        err instanceof Error ? err.message : t('publish_categories_error', { defaultValue: "Couldn't load categories" }),
      )
    } finally {
      setCategoriesLoading(false)
    }
  }

  const selectCategory = (id: number) => {
    setForm((prev) => ({ ...prev, category_selected_id: String(id) }))
    setCategoryOpen(false)
  }

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    setPhotoItems((prev) =>
      [
        ...prev,
        ...files.map((file) => ({ preview: URL.createObjectURL(file), file })),
      ].slice(0, maxFiles),
    )
    event.target.value = ''
  }

  const removeImage = (index: number) => {
    setPhotoItems((prev) => prev.filter((_, i) => i !== index))
  }

  const saveZone = (zone: ShippingZone) => {
    setError(null)
    setForm((prev) => ({ ...prev, shipping_zone: [...prev.shipping_zone, zone] }))
    setZoneOpen(false)
  }

  const saveFreeZone = (zone: ShippingZone) => {
    setError(null)
    setForm((prev) => ({ ...prev, free_shipping_zone: [...prev.free_shipping_zone, zone] }))
    setFreeZoneOpen(false)
  }

  const removeFreeZone = (index: number) => {
    setForm((prev) => ({
      ...prev,
      free_shipping_zone: prev.free_shipping_zone.filter((_, i) => i !== index),
    }))
  }

  const removeZone = (index: number) => {
    setForm((prev) => ({
      ...prev,
      shipping_zone: prev.shipping_zone.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!form.category_selected_id) {
      showAlert(
        t('publish_category_required', { defaultValue: 'Please select a category.' }),
        '',
        'warning',
      )
      return
    }
    if (!form.libelle.trim() || !form.price) {
      setError(t('publish_validation_error', { defaultValue: 'Please fill in the title and the price.' }))
      return
    }
    if (!form.is_digital && !form.description.trim()) {
      setError(t('publish_validation_error', { defaultValue: 'Please fill in the title and the price.' }))
      return
    }
    if (!form.saling_terms_agreements) {
      setError(t('publish_saling_terms_required', { defaultValue: 'Please accept the selling terms before publishing.' }))
      return
    }

    setSubmitting(true)
    try {
      const basePayload = {
        categories_id: form.category_selected_id,
        libelle: form.libelle.trim(),
        description: form.description.trim(),
        price: form.price,
        quantity: form.quantity || '1',
        address: form.address.trim(),
        country_code: form.country_code,
        city: form.city.trim(),
        email: form.email.trim(),
        is_digital: form.is_digital,
        shipping_zone: form.shipping_zone,
        free_shipping: form.free_shipping,
        free_shipping_zone: form.free_shipping_zone,
        promotion_fees_activated: form.promotion_fees_activated,
        promotion_fees_percentage: form.promotion_fees_percentage,
      }

      if (isEdit && productIdNum) {
        const photos: string[] = []
        const newFiles: File[] = []
        for (const item of photoItems) {
          if (item.ref) {
            photos.push(item.ref)
          } else if (item.file) {
            newFiles.push(item.file)
          }
        }
        console.log('Updating product with payload:', { ...basePayload, photos, images: newFiles })
        const res = await updateProduct(
          productIdNum,
          { ...basePayload, photos, images: newFiles },
          authToken ?? undefined,
        )
        console.log('Update product response:', res)
        setSubmitting(false)
        if ((res as any).status) {
          setSuccess(true)
          showAlert(
            t('publish_update_success_title', { defaultValue: 'Product updated!' }),
            '',
            'success',
            1400,
          )
          setTimeout(() => navigate(`/product/${productIdNum}`), 1400)
          return
        }
        if ((res as any).message) {
          setError((res as any).message)
        } else {
          setError(t('message.an_error_occured', { defaultValue: 'Failed to update product' }))
        }
        return
      }

      const res = await createProduct(
        {
          ...basePayload,
          product_available: form.product_available,
          saling_terms_agreements: form.saling_terms_agreements,
          images: photoItems.filter((item) => item.file).map((item) => item.file as File),
        },
        authToken ?? undefined,
      )
      setSubmitting(false)
      if ((res as any).status) {
        setSuccess(true)
        showAlert(
          t('publish_success_title', { defaultValue: 'Product published!' }),
          t('publish_success_subtitle', { defaultValue: 'Redirecting to the marketplace…' }),
          'success',
          1400,
        )
        setTimeout(() => navigate('/my-store'), 1400)
        return
      }else if((res as any).message) {
        setError((res as any).message)
      } else {
        setError(t('message.an_error_occured', { defaultValue: 'Failed to publish product 2' }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('publish_error', { defaultValue: 'Failed to publish product' }))
      showAlert(
        t('publish_error', { defaultValue: 'Failed to publish product' }),
        err instanceof Error ? err.message : '',
        'error',
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <section className="px-4 py-6">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-white shadow-soft">
              <CheckCircle2 size={32} />
            </span>
            <h2 className="text-lg font-bold text-primary-dark">
              {isEdit
                ? t('publish_update_success_title', { defaultValue: 'Product updated!' })
                : t('publish_success_title', { defaultValue: 'Product published!' })}
            </h2>
            <p className="text-xs text-ink-soft">
              {isEdit
                ? t('publish_success_subtitle', { defaultValue: 'Redirecting to the product…' })
                : t('publish_success_subtitle', { defaultValue: 'Redirecting to the marketplace…' })}
            </p>
          </div>
        ) : loadingProduct ? (
          <div className="flex flex-col items-center gap-2 py-16 text-xs text-ink-soft">
            <img src="/site_images/index_loader.gif" alt="" className="w-[70px] rounded-sm" />
            {t('loading', { defaultValue: 'Loading…' })}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle size={28} className="text-red-500" />
            <p className="text-sm font-semibold text-ink">{loadError}</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
            >
              {t('home', { defaultValue: 'Home' })}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              {/* <label className={labelClass}>
                {t('category', { defaultValue: 'Category *' })}
              </label> */}
              <button
                type="button"
                onClick={openCategoryPicker}
                className={`${inputClass} flex items-center justify-between gap-2 text-left`}
              >
                <span className={selectedCategory ? '' : 'text-slate-400'}>
                  {selectedCategory
                    ? t(`categories.${selectedCategory.code}`)
                    : t('select_category', { defaultValue: 'select a category…' })}
                </span>
                <ChevronDown size={16} className="shrink-0 text-slate-400" />
              </button>
            </div>

            <div>
              <label htmlFor="libelle" className={labelClass}>
                {t('libelle', { defaultValue: 'Name *' })}
              </label>
              <input
                id="libelle"
                type="text"
                maxLength={120}
                placeholder={t('publish_title_placeholder', { defaultValue: 'e.g. Handmade leather bag' })}
                value={form.libelle}
                onChange={(e) => updateField('libelle', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                {t('description', { defaultValue: 'Description *' })}
              </label>
              <textarea
                id="description"
                rows={4}
                maxLength={2000}
                placeholder={t('please enter a description', { defaultValue: 'Describe your product or service…' })}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                className={`${inputClass} resize-none`}
              />
            </div>

            <label
              htmlFor="is_digital"
              className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-3"
            >
              <span className="text-xs font-semibold text-ink-soft">
                {t('is_digital', { defaultValue: 'Digital product' })}
                <span className="block text-[10px] font-normal text-slate-400">
                  {t('digital_product_message', {
                    defaultValue: 'Delivered electronically, no shipping needed',
                  })}
                </span>
              </span>
              <input
                id="is_digital"
                type="checkbox"
                checked={form.is_digital}
                onChange={(e) => updateField('is_digital', e.target.checked)}
                className="peer sr-only"
              />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
            </label>

            <div>
              <label htmlFor="price" className={labelClass}>
                {t('price_in_usd', { defaultValue: 'Price (USD) *' })}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  $
                </span>
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => updateField('price', e.target.value)}
                  className={`${inputClass} pl-8 pr-28`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary">
                  {piAmount != null
                    ? `${t('publish_approx', { defaultValue: '≈' })} ${piAmount.toFixed(2)} π`
                    : '0.00 π'}
                </span>
              </div>
              {piRate === 0 && (
                <p className="mt-1.5 text-[10px] text-slate-400">
                  {t('publish_rate_unavailable', {
                    defaultValue: 'Pi conversion rate is not available yet.',
                  })}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                {t('profilForm.email_for_notifications', { defaultValue: 'Email for notifications *' })}
              </label>
              <input
                id="email"
                type="email"
                maxLength={160}
                placeholder={t('publish_email_placeholder', { defaultValue: 'you@example.com' })}
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputClass}
              />
            </div>

            {form.is_digital && (//Ask only for country when product is digital
              <div>
                <label htmlFor="country_code" className={labelClass}>
                  {t('select_country', { defaultValue: 'Country *' })}
                </label>
                <select
                  id="country_code"
                  value={selectedCountryExists ? form.country_code : ''}
                  onChange={(e) => updateField('country_code', e.target.value)}
                  className={inputClass}
                >
                  {!selectedCountryExists && (
                    <option value="" disabled>
                      {t('select_country', { defaultValue: 'Select a country…' })}
                    </option>
                  )}
                  {countries.map(([code, name]) => (
                    <option key={code} value={code}>
                      {code === 'Other'
                        ? t('publish_other', { defaultValue: 'Other' })
                        : name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!form.is_digital && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="quantity" className={labelClass}>
                      {t('quantity', { defaultValue: 'Quantity *' })}
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={form.quantity}
                      onChange={(e) => updateField('quantity', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="country_code" className={labelClass}>
                      {t('select_country', { defaultValue: 'Country *' })}
                    </label>
                    <select
                      id="country_code"
                      value={selectedCountryExists ? form.country_code : ''}
                      onChange={(e) => updateField('country_code', e.target.value)}
                      className={inputClass}
                    >
                      {!selectedCountryExists && (
                        <option value="" disabled>
                          {t('select_country', { defaultValue: 'Select a country…' })}
                        </option>
                      )}
                      {countries.map(([code, name]) => (
                        <option key={code} value={code}>
                          {code === 'Other'
                            ? t('publish_other', { defaultValue: 'Other' })
                            : name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="city" className={labelClass}>
                    {t('address.city', { defaultValue: 'City *' })}
                  </label>
                  {citiesLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-xs font-semibold text-ink-soft">
                      <Loader2 size={14} className="animate-spin text-primary" />
                      {t('publish_cities_loading', { defaultValue: 'Loading cities…' })}
                    </div>
                  ) : cities.length > 0 ? (
                    <select
                      id="city"
                      value={form.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        {t('select_city', { defaultValue: 'Select a city…' })}
                      </option>
                      {form.city && !cities.includes(form.city) && (
                        <option key="existing-city" value={form.city}>
                          {form.city}
                        </option>
                      )}
                      {cities.map((item, index) => (
                        <option key={`${item}-${index}`} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="city"
                      type="text"
                      maxLength={120}
                      placeholder={t('address.city', { defaultValue: 'e.g. Paris' })}
                      value={form.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      className={inputClass}
                    />
                  )}
                  {citiesError && cities.length === 0 && (
                    <p className="mt-1.5 text-[10px] text-slate-400">{citiesError}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="address" className={labelClass}>
                    {t('address.address', { defaultValue: 'Address *' })}
                  </label>
                  <input
                    id="address"
                    type="text"
                    maxLength={160}
                    placeholder={t('address.street_address', { defaultValue: 'City, street…' })}
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <span className={labelClass}>
                    {t('shipping_zones_and_fees', { defaultValue: 'Zones and shipping fees' })}
                  </span>
                  {form.shipping_zone.length > 0 && (
                    <div className="space-y-2">
                      {form.shipping_zone.map((zone, index) => {
                        const zonePi =
                          zone.fee && piRate > 0 && Number(zone.fee) > 0
                            ? (Number(zone.fee) / piRate).toFixed(2)
                            : null
                        return (
                          <div
                            key={`${zone.country_code}-${zone.city}-${index}`}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5"
                          >
                            <div className="text-xs font-semibold text-ink">
                              <span>{zone.country_name}</span>
                              {zone.city && <span className="text-ink-soft"> · {zone.city}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {zone.fee && Number(zone.fee) > 0 ? (
                                <span className="text-xs font-bold text-primary">
                                  ${zone.fee}
                                  {zonePi ? ` (${zonePi} π)` : ''}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-emerald-500">
                                  {t('free', { defaultValue: 'Free' })}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeZone(index)}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft transition hover:bg-red-50 hover:text-red-500"
                                aria-label={t('publish_remove_zone', { defaultValue: 'Remove zone' })}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {!zoneOpen ? (
                    <button
                      type="button"
                      onClick={() => setZoneOpen(true)}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-mist/40 py-3 text-xs font-semibold text-primary transition hover:border-primary hover:bg-mist"
                    >
                      <Plus size={16} />
                      {t('add', { defaultValue: 'Add' })}
                    </button>
                  ) : null}
                </div>

                <label
                  htmlFor="free_shipping"
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-3"
                >
                  <span className="text-xs font-semibold text-ink-soft">
                    {t('free_shipping', { defaultValue: 'Free shipping' })}
                    <span className="block text-[10px] font-normal text-slate-400">
                      {t('publish_free_shipping_hint', {
                        defaultValue: 'Offer free delivery to the buyer',
                      })}
                    </span>
                  </span>
                  <input
                    id="free_shipping"
                    type="checkbox"
                    checked={form.free_shipping}
                    onChange={(e) => updateField('free_shipping', e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                </label>

                {form.free_shipping && (
                  <div>
                    <span className={labelClass}>
                      {t('free_shipping_zones', { defaultValue: 'Zone & free shippings' })}
                    </span>
                    {form.free_shipping_zone.length > 0 && (
                      <div className="space-y-2">
                        {form.free_shipping_zone.map((zone, index) => (
                          <div
                            key={`${zone.country_code}-${zone.city}-${index}`}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5"
                          >
                            <div className="text-xs font-semibold text-ink">
                              <span>{zone.country_name}</span>
                              {zone.city && <span className="text-ink-soft"> · {zone.city}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-emerald-500">
                                {t('free', { defaultValue: 'Free' })}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFreeZone(index)}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft transition hover:bg-red-50 hover:text-red-500"
                                aria-label={t('publish_remove_zone', { defaultValue: 'Remove zone' })}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!freeZoneOpen ? (
                      <button
                        type="button"
                        onClick={() => setFreeZoneOpen(true)}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-mist/40 py-3 text-xs font-semibold text-primary transition hover:border-primary hover:bg-mist"
                      >
                        <Plus size={16} />
                        {t('add', { defaultValue: 'Add' })}
                      </button>
                    ) : null}
                  </div>
                )}
              </>
            )}

            <div>
              <span className={labelClass}>{t('upload.image_label', { nb: maxFiles, defaultValue: `Images (max = ${maxFiles})` })}</span>
              <div className="grid grid-cols-3 gap-2">
                {photoItems.map((item, index) => (
                  <div
                    key={`${item.preview}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-xl border border-slate-200"
                  >
                    <img src={item.preview} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label={t('publish_remove_image', { defaultValue: 'Remove image' })}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {photoItems.length < maxFiles && (
                  <label
                    htmlFor="images"
                    className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/30 bg-mist/40 text-primary transition hover:border-primary hover:bg-mist"
                  >
                    <ImagePlus size={22} />
                    <span className="text-[10px] font-semibold">{t('publish_add_photo', { defaultValue: 'Add photo' })}</span>
                    <input
                      id="images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFiles}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 text-xs font-medium text-ink-soft">
                {t('promotion_text_explanation', {
                  defaultValue: 'Activating a promotion allows you to offer a percentage discount to users to make your item more attractive and increase your chances of selling.',
                })}
              </div>

              <label
                htmlFor="promotion_fees_activated"
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-3"
              >
                <span className="text-xs font-semibold text-ink-soft">
                  <span className="block text-[10px] font-normal text-slate-400">
                    {t('promotion fees percentage', {
                      defaultValue: 'Activate a promotion commission on this product',
                    })}
                  </span>
                </span>
                <input
                  id="promotion_fees_activated"
                  type="checkbox"
                  checked={form.promotion_fees_activated}
                  onChange={(e) => updateField('promotion_fees_activated', e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
              </label>

              {form.promotion_fees_activated && (
                <div>
                  <label htmlFor="promotion_fees_percentage" className={labelClass}>
                    {t('promotion fees percentage', { defaultValue: 'Promotion fees (%)' })}
                  </label>
                  <input
                    id="promotion_fees_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="e.g. 5"
                    value={form.promotion_fees_percentage}
                    onChange={(e) => updateField('promotion_fees_percentage', e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              <label
                htmlFor="product_available"
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-3"
              >
                <span className="text-xs font-semibold text-ink-soft">
                  <span className="block text-[10px] font-normal text-slate-400">
                    {t('i_agree_product_availability', {
                      defaultValue: 'Make this product visible to buyers',
                    })}
                  </span>
                </span>
                <input
                  id="product_available"
                  type="checkbox"
                  checked={form.product_available}
                  onChange={(e) => updateField('product_available', e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
              </label>

              <label
                htmlFor="saling_terms_agreements"
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-3"
              >
                <span className="text-xs font-semibold text-ink-soft">
                  {t('selling_terms', { defaultValue: 'Selling terms' })}
                  <span className="block text-[10px] font-normal text-slate-400">
                    {t('agree_to_platform_selling_terms', {
                      defaultValue: 'I agree to the platform selling terms',
                    })}
                  </span>
                </span>
                <input
                  id="saling_terms_agreements"
                  type="checkbox"
                  checked={form.saling_terms_agreements}
                  onChange={(e) => updateField('saling_terms_agreements', e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !form.product_available || !form.saling_terms_agreements}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3.5 text-sm font-bold text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {isEdit
                    ? t('updating…', { defaultValue: 'Updating…' })
                    : t('publishing…', { defaultValue: 'Publishing…' })}
                </>
              ) : isEdit ? (
                t('update_product', { defaultValue: 'Update product' })
              ) : (
                t('publish', { defaultValue: 'Publish product' })
              )}
            </button>

            <p className="text-center text-[10px] leading-relaxed text-slate-400">
              {t('publish_policies_notice', {
                defaultValue: "By publishing, you agree to Piketplace's selling policies.",
              })}
            </p>
          </form>
        )}
      </section>

      <ShippingZoneForm
        open={zoneOpen}
        countries={countries}
        piRate={piRate}
        onSave={saveZone}
        onCancel={() => setZoneOpen(false)}
      />

      <ShippingZoneForm
        open={freeZoneOpen}
        countries={countries}
        piRate={piRate}
        feeEnabled={false}
        onSave={saveFreeZone}
        onCancel={() => setFreeZoneOpen(false)}
      />

      {categoryOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setCategoryOpen(false)}
          >
            <div
              className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-primary-dark">
                  {t('choose_category', { defaultValue: 'Choose a category' })}
                </h3>
                <button
                  type="button"
                  onClick={() => setCategoryOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {categoriesLoading && (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs font-semibold text-ink-soft">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    {t('publish_categories_loading', { defaultValue: 'Loading categories…' })}
                  </div>
                )}
                {categoriesError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{categoriesError}</span>
                  </div>
                )}
                {!categoriesLoading && !categoriesError && (
                  <div className="space-y-1">
                    {categories.map((category) => {
                      const isSelected = String(category.id) === form.category_selected_id
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => selectCategory(category.id)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-ink transition hover:bg-pink-50"
                        >
                          <span>{t(`categories.${category.code}`)}</span>
                          {isSelected && <Check size={18} className="text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { flagEmoji } from '../lib/geo'
import countries from '../locales/countries.json'
import type { FilterState, ProductTypeFilter, SortBy } from '../lib/filterState'

interface Country {
  id: number
  name: string
  iso3: string
  iso2: string
  [key: string]: unknown
}

interface FilterModalProps {
  open: boolean
  initial: FilterState
  onClose: () => void
  onApply: (filter: FilterState) => void
}

const countryList = (Array.isArray(countries) ? countries : []) as Country[]

export default function FilterModal({ open, initial, onClose, onApply }: FilterModalProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState(initial.search)
  const [iso2, setIso2] = useState(initial.iso2)
  const [iso3, setIso3] = useState(initial.iso3)
  const [productType, setProductType] = useState<ProductTypeFilter>(initial.productType)
  const [sortBy, setSortBy] = useState<SortBy>(initial.sortBy)

  useEffect(() => {
    if (open) {
      setSearch(initial.search)
      setIso2(initial.iso2)
      setIso3(initial.iso3)
      setProductType(initial.productType)
      setSortBy(initial.sortBy)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const apply = () => {
    onApply({ search, iso2, iso3, productType, sortBy, category: null, isUpdated: true })
    onClose()
  }

  const selectCountry = (country: Country) => {
    if (country.iso2 === 'all') {
      setIso2('all')
      setIso3('all')
    } else {
      setIso2(country.iso2)
      setIso3(country.iso3)
    }
  }

  const switchRow = (active: boolean, onClick: () => void, label: string) => (
    <button
      type="button"
      onClick={onClick}
      className="mb-1.5 flex w-full items-center justify-between rounded-xl border border-black/5 px-2 py-2 text-sm transition"
      style={{
        backgroundColor: active ? '#ec11b5' : 'transparent',
        color: active ? '#fff' : '#5b5757',
      }}
    >
      <span className="font-medium">{label}</span>
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full"
        style={{ backgroundColor: active ? '#fff' : 'rgba(0,0,0,0.06)' }}
      >
        {active && <Check size={13} style={{ color: '#ec11b5' }} />}
      </span>
    </button>
  )

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-4 pb-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-0.5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary-dark">
            {t('filter.text', { defaultValue: 'Filter' })}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
            aria-label={t('close', { defaultValue: 'Close' })}
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-1.5 text-center text-xs text-ink-soft">
          {t('filter_text_hint', {
            defaultValue: 'Refine the products you see',
          })}
        </p>

        <div className="space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_product', { defaultValue: 'Search products…' })}
            className="h-9 w-full rounded-3xl border border-black/10 bg-slate-100 px-4 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <div>
            <div className="mb-0.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                {t('filter.sort_by_country', { defaultValue: 'Sort by country' })}
              </label>
              {iso2 !== 'all' && (
                <button
                  type="button"
                  onClick={() => setIso2('all')}
                  className="rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {t('all_countries', { defaultValue: 'All countries' })}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-black/5 bg-slate-100 px-2 py-1.5">
              <MapPin size={14} className="shrink-0 text-ink-soft" />
              <select
                value={iso2}
                onChange={(e) => {
                  const value = e.target.value
                  const country = countryList.find((c) => c.iso2 === value)
                  selectCountry(country ?? { id: 0, name: 'All', iso2: 'all', iso3: 'all' })
                }}
                className="h-7 w-full rounded-lg bg-transparent text-sm text-ink outline-none"
              >
                <option value="all">
                  {'🌐'} {t('all_countries', { defaultValue: 'All countries' })}
                </option>
                {countryList
                  .filter((c) => typeof c.name === 'string')
                  .map((c) => (
                    <option key={c.id} value={c.iso2}>
                      {flagEmoji(c.iso2)} {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            {switchRow(
              productType === 'all',
              () => setProductType('all'),
              t('show_all', { defaultValue: 'Show all' }),
            )}
            {switchRow(
              productType === 'show_products_shipping_on',
              () => setProductType('show_products_shipping_on'),
              t('filter.show_products_shipping_on', {
                defaultValue: 'Show only products that sellers set shipping zones on',
              }),
            )}
            {switchRow(
              productType === 'show_only_digital_products',
              () => setProductType('show_only_digital_products'),
              t('filter.show_only_digital_products', { defaultValue: 'Show only digital products' }),
            )}
          </div>

          <div>
            <label className="mb-0.5 block text-xs font-semibold text-ink">
              {t('filter.displayed_by', { defaultValue: 'Displayed by' })}
            </label>
            {switchRow(
              sortBy === 'newest',
              () => setSortBy('newest'),
              t('filter.newest', { defaultValue: 'Newest' }),
            )}
            {switchRow(
              sortBy === 'oldest',
              () => setSortBy('oldest'),
              t('filter.oldest', { defaultValue: 'Oldest' }),
            )}
            {switchRow(
              sortBy === 'random',
              () => setSortBy('random'),
              t('filter.random', { defaultValue: 'Random' }),
            )}
          </div>

          <button
            type="button"
            onClick={apply}
            className="mt-0.5 w-full rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:shadow-hover"
          >
            {t('filter.text', { defaultValue: 'Filter' })}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

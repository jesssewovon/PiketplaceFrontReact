import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Product } from '../types'
import { flagEmoji } from '../lib/geo'
import { formatAmount } from '../lib/format'
import LazyImage from './LazyImage'
import ProductShippingLabel from './ProductShippingLabel'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation()
  const image = product.imageFirst ?? product.images?.[0]?.lien

  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-transparent shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
    >
      <div className="relative overflow-hidden">
        <LazyImage
          src={image ?? ''}
          alt={product.libelle}
          variant="natural"
          imgClassName="group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <p className="px-1.5 pb-1 pt-2 text-sm font-semibold text-gray">
        <span className="mr-1.5 align-middle text-base leading-none">
          {flagEmoji(product.country_code ?? '')}
        </span>
        <span className="align-middle text-black">•</span>
        <span className="break-libelle-product ml-1.5 align-middle">
          {product.libelle}
        </span>
      </p>
      
      <div className="mt-0.5 flex items-center gap-1 px-1.5 pb-3">
        <span className="text-sm font-semibold text-black">
          {formatAmount(product.price, product.currency)}
        </span>
        {product.is_digital ? (
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            {t('digital', { defaultValue: 'Digital' })}
          </span>
        ) : (
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            {t('instock', { quantity: product.quantity ?? 0, defaultValue: '{quantity} in stock' })}
          </span>
        )}
      </div>

      <ProductShippingLabel product={product} className="px-3 mb-3" />
    </Link>
  )
}

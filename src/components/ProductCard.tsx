import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { flagEmoji } from '../lib/geo'
import LazyImage from './LazyImage'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
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

      <p className="px-3 pb-3 pt-2 text-sm font-semibold text-gray">
        <span className="mr-1.5 align-middle text-base leading-none">
          {flagEmoji(product.country_code ?? '')}
        </span>
        <span className="align-middle text-black">•</span>
        <span className="break-libelle-product ml-1.5 align-middle">
          {product.libelle}
        </span>
      </p>
    </Link>
  )
}

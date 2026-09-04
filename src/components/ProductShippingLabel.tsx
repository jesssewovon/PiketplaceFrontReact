import { Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Product } from '../types'

interface ProductShippingLabelProps {
  product: Product
  className?: string
}

export default function ProductShippingLabel({ product, className = '' }: ProductShippingLabelProps) {
  const { t } = useTranslation()
  if (product.is_digital) return null

  const hasPaid = (product.shipping_zone?.length ?? 0) > 0
  const hasFree = product.free_shipping === true || (product.free_shipping_zone?.length ?? 0) > 0
  if (!hasPaid && !hasFree) return null

  const label = hasPaid && hasFree
    ? t('paid_free_shipping', { defaultValue: 'Paid & free shipping' })
    : hasPaid
      ? t('paid_shipping', { defaultValue: 'Paid shipping' })
      : t('free_shipping', { defaultValue: 'Free shipping' })

  return (
    <p className={`mt-1 text-[11px] font-medium text-gray-500 ${className}`}>
      <Truck size={12} className="mr-1 inline text-red-500" />
      {label}
    </p>
  )
}
import { ShoppingCart, Store, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '../types'
import { formatDate } from '../lib/format'
import { useAppSelector } from '../store/hooks'

function messageImageUrl(message: ChatMessage): string {
  if (!message.message) return ''
  try {
    const parsed = JSON.parse(message.message)
    return Array.isArray(parsed) ? parsed[0]?.lien ?? '' : ''
  } catch {
    return ''
  }
}

export default function MessageLine({
  message,
  onImageClick,
}: {
  message: ChatMessage
  onImageClick?: (src: string) => void
}) {
  const { t } = useTranslation()
  const user = useAppSelector((state) => state.auth.user)
  const isMine =
    message.sender_id === user?.id ||
    (message.admin_support_id != null && message.admin_support_id === user?.id)
  const imgSrc = message.isImage ? messageImageUrl(message) : ''
  const isSeller = !!(
    message.line_order?.product &&
    message.sender_id === message.line_order.product.user?.id
  )
  const isDeliver = !!(
    message.line_order?.deliver &&
    message.sender_id === message.line_order.deliver.id
  )
  const sender = message.sender

  return (
    <div className="mb-3.5">
      <div className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
        <div
          className={`relative max-w-[78%] rounded-2xl px-3 py-1.5 text-sm leading-snug shadow-sm ${
            isMine ? 'rounded-tl-sm bg-primary text-white' : 'rounded-tr-sm bg-white text-ink'
          }`}
        >
          {!isMine && isDeliver && (
            <Truck
              size={15}
              className={`mr-1 inline ${isMine ? '' : 'text-primary'}`}
              aria-label={t('delivery', { defaultValue: 'Delivery' })}
            />
          )}
          {!isMine && isSeller && (
            <Store
              size={13}
              className={`mr-1 inline ${isMine ? '' : 'text-primary'}`}
              aria-label={t('shop', { defaultValue: 'Shop' })}
            />
          )}
          {!isMine && sender?.avatar && (
            <img
              src={sender.avatar}
              alt={sender.fullnameOrUsername ?? ''}
              className="mr-1 inline h-4 w-4 rounded-full object-cover"
            />
          )}
          {!isMine && sender?.fullnameOrUsername && (
            <em className="mr-1 block text-[10px] leading-tight text-ink-soft">
              {sender.fullnameOrUsername}
            </em>
          )}
          {message.isImage && imgSrc ? (
            <img
              src={imgSrc}
              alt={message.imageName ?? ''}
              className="h-24 w-24 cursor-pointer object-contain"
              onClick={() => onImageClick?.(imgSrc)}
            />
          ) : (
            <span>{message.message ?? ''}</span>
          )}
          {!isMine && !message.isImage && !message.message && (
            <ShoppingCart size={16} className="text-ink-soft" />
          )}
        </div>
      </div>
      <em
        className={`block text-[10px] text-ink-soft ${isMine ? 'text-left' : 'text-right'}`}
      >
        {formatDate(message.created_at)}
      </em>
    </div>
  )
}

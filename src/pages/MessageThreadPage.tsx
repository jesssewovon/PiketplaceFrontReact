import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Image, Loader2, MapPin, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ChatMessage, LineOrder } from '../types'
import {
  fetchOrderMessages,
  fetchOrderNewMessages,
  fetchOrderOldMessages,
  sendOrderMessage,
} from '../lib/api'
import { useAppSelector } from '../store/hooks'
import MessageLine from '../components/MessageLine'
import LoginPanel from '../components/LoginPanel'

type AddressPanel = 'none' | 'product' | 'shipping'

function dedupe(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<number>()
  const out: ChatMessage[] = []
  for (const m of messages) {
    const key = m.id ?? 0
    if (key && seen.has(key)) continue
    if (key) seen.add(key)
    out.push(m)
  }
  return out
}

export default function MessageThreadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { correspondingId, lineOrderId } = useParams<{
    correspondingId: string
    lineOrderId: string
  }>()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [correspondingUser, setCorrespondingUser] = useState<
    { id?: number; avatar?: string; shopNameShow?: string; fullnameOrUsername?: string } | null
  >(null)
  const [lineOrder, setLineOrder] = useState<LineOrder | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isSendFile, setIsSendFile] = useState(false)
  const [noMoreData, setNoMoreData] = useState(false)
  const [addressPanel, setAddressPanel] = useState<AddressPanel>('none')
  const [previewUrl, setPreviewUrl] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const selectedFileRef = useRef<File | null>(null)
  const startMessageIdRef = useRef(0)
  const endMessageIdRef = useRef(0)
  const topLoadedRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)

  const correspondingIdNum = Number(correspondingId)
  const lineOrderIdNum = Number(lineOrderId)

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }

  const initialLoad = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetchOrderMessages(token ?? undefined, {
        user_id: user?.id ?? 0,
        corresponding_id: correspondingIdNum,
        line_order_id: lineOrderIdNum,
      })
      setMessages(res.messages ?? [])
      setLineOrder(res.line_order ?? null)
      setCorrespondingUser(res.corresponding_user ?? null)
      if (res.messages && res.messages.length > 0) {
        const sorted = [...res.messages].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
        startMessageIdRef.current = sorted[0].id ?? 0
        endMessageIdRef.current = sorted[sorted.length - 1].id ?? 0
      }
    } finally {
      setIsLoading(false)
      scrollToBottom()
    }
  }, [token, user?.id, correspondingIdNum, lineOrderIdNum])

  const loadNewMessages = useCallback(async () => {
    if (!isLoggedIn) return
    try {
      const res = await fetchOrderNewMessages(token ?? undefined, {
        user_id: user?.id ?? 0,
        line_order_id: lineOrderIdNum,
        end_message_id: endMessageIdRef.current || undefined,
      })
      const fresh = (res.newMessages ?? []).filter((m) => m.id != null)
      if (fresh.length === 0) return
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m.id))
        const toAdd = fresh.filter((m) => !existing.has(m.id))
        if (toAdd.length === 0) return prev
        return dedupe([...prev, ...toAdd]).sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      })
      scrollToBottom()
    } catch {
      // silent poll error
    }
  }, [isLoggedIn, token, user?.id, lineOrderIdNum])

  const loadOldMessages = useCallback(async () => {
    if (topLoadedRef.current || !isLoggedIn) return
    topLoadedRef.current = true
    try {
      const res = await fetchOrderOldMessages(token ?? undefined, {
        user_id: user?.id ?? 0,
        line_order_id: lineOrderIdNum,
        start_message_id: startMessageIdRef.current || undefined,
      })
      const old = res.oldMessages ?? []
      if (old.length === 0) {
        setNoMoreData(true)
      } else {
        setMessages((prev) => dedupe([...old, ...prev]).sort((a, b) => (a.id ?? 0) - (b.id ?? 0)))
        if (res.start_message_id) startMessageIdRef.current = res.start_message_id
      }
    } finally {
      requestAnimationFrame(() => topLoadedRef.current = false)
    }
  }, [isLoggedIn, token, user?.id, lineOrderIdNum])

  useEffect(() => {
    if (!isLoggedIn || !correspondingIdNum || !lineOrderIdNum) return
    void initialLoad()
    const poll = setInterval(() => void loadNewMessages(), 10000)
    return () => clearInterval(poll)
  }, [isLoggedIn, correspondingIdNum, lineOrderIdNum, user?.id, initialLoad, loadNewMessages])

  useEffect(() => {
    const top = topRef.current
    if (!top) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isLoading) void loadOldMessages()
    })
    observer.observe(top)
    return () => observer.disconnect()
  }, [isLoading, loadOldMessages])

  const handleSend = async () => {
    const sendingFile = isSendFile || selectedFileRef.current != null
    if (!input.trim() && !sendingFile) return
    setIsSending(true)
    try {
      const res = await sendOrderMessage(token ?? undefined, {
        sender_id: user?.id ?? 0,
        receiver_id: correspondingIdNum,
        message: input.trim(),
        line_order_id: lineOrderIdNum,
        end_message_id: endMessageIdRef.current || 0,
        file: selectedFileRef.current,
      })
      console.log('sendOrderMessage response:', res)
      if (res.status) {
        setInput('')
        selectedFileRef.current = null
        setPreviewUrl('')
        setIsSendFile(false)
        setMessages((prev) =>
          dedupe([...prev, ...(res.newMessages ?? [])]).sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
        )
        scrollToBottom()
      } else if (res.message) {
        // surfaced silently; keep message for retry
      }
    } catch {
      // keep input for retry
    } finally {
      setIsSending(false)
    }
  }

  const selectFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) {
      selectedFileRef.current = null
      setPreviewUrl('')
      return
    }
    selectedFileRef.current = file
    setIsSendFile(true)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const displayMessages = useMemo(
    () => dedupe(messages).sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
    [messages],
  )

  const title: string =
    correspondingUser?.shopNameShow ??
    correspondingUser?.fullnameOrUsername ??
    (correspondingUser?.id != null ? String(correspondingUser.id) : '')

  if (!isLoggedIn) {
    return (
      <div className="relative animate-fade-in">
        <MessageThreadShim title={title} />
        <LoginPanel />
      </div>
    )
  }

  return (
    <div className="flex h-dvh animate-fade-in flex-col">
      <div className="flex items-center gap-2 border-b border-black/5 bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink transition hover:bg-black/5"
          aria-label={t('back', { defaultValue: 'Back' })}
        >
          <svg className="tw:ml-[10px] tw:align-[sub!important] tw:inline" width="20px" height="20px" viewBox="0 0 75.80 75.80" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="2.27409"><g id="Group_64" data-name="Group 64" transform="translate(-624.082 -383.588)"><path id="Path_56" data-name="Path 56" d="M660.313,383.588a1.5,1.5,0,0,1,1.06,2.561l-33.556,33.56a2.528,2.528,0,0,0,0,3.564l33.556,33.558a1.5,1.5,0,0,1-2.121,2.121L625.7,425.394a5.527,5.527,0,0,1,0-7.807l33.556-33.559A1.5,1.5,0,0,1,660.313,383.588Z" fill="#a63289"></path></g></g><g id="SVGRepo_iconCarrier"><g id="Group_64" data-name="Group 64" transform="translate(-624.082 -383.588)"><path id="Path_56" data-name="Path 56" d="M660.313,383.588a1.5,1.5,0,0,1,1.06,2.561l-33.556,33.56a2.528,2.528,0,0,0,0,3.564l33.556,33.558a1.5,1.5,0,0,1-2.121,2.121L625.7,425.394a5.527,5.527,0,0,1,0-7.807l33.556-33.559A1.5,1.5,0,0,1,660.313,383.588Z" fill="#a63289"></path></g></g></svg>
        </button>
        {correspondingUser?.avatar && (
          <img
            src={correspondingUser.avatar}
            alt={title}
            className="h-8 w-8 rounded-full object-cover"
          />
        )}
        <strong className="min-w-0 flex-1 truncate text-base font-bold text-ink">{title || '…'}</strong>
        {lineOrder && (
          <button
            type="button"
            onClick={() => setAddressPanel(addressPanel === 'none' ? 'product' : 'none')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary transition hover:bg-black/5"
            aria-label={t('addresses', { defaultValue: 'Addresses' })}
          >
            <MapPin size={18} />
          </button>
        )}
      </div>

      {addressPanel !== 'none' && lineOrder && (
        <AddressPanel order={lineOrder} tab={addressPanel} onSwitch={setAddressPanel} />
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div ref={topRef} className="flex justify-center py-2">
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-primary" />
          ) : noMoreData && displayMessages.length > 0 ? (
            <span className="text-[11px] font-medium text-ink-soft">
              {t('no_more_data', { defaultValue: 'No more data' })}
            </span>
          ) : displayMessages.length > 0 ? (
            <Loader2 size={16} className="animate-spin text-primary" />
          ) : null}
        </div>

        {displayMessages.map((message) => (
          <MessageLine key={message.id ?? message.created_at} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 flex items-end gap-2 border-t border-black/5 bg-white/95 p-2">
        {previewUrl && (
          <div className="relative">
            <img src={previewUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => {
                selectedFileRef.current = null
                setPreviewUrl('')
                setIsSendFile(false)
                if (fileRef.current) fileRef.current.value = ''
              }}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label={t('remove', { defaultValue: 'Remove' })}
            >
              ×
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/gif"
          className="hidden"
          onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-primary transition hover:bg-gray-300"
          aria-label={t('add_image', { defaultValue: 'Add image' })}
        >
          <Image size={17} />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSend()
          }}
          placeholder={t('enter_message', { defaultValue: 'Write your message…' })}
          className="min-w-0 flex-1 rounded-full border border-black/10 bg-gray-100 px-4 py-2 text-sm text-ink outline-none transition focus:border-primary focus:bg-white"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={isSending || (!input.trim() && !isSendFile && !selectedFileRef.current)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-dark disabled:opacity-50"
          aria-label={t('send', { defaultValue: 'Send' })}
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  )
}

function MessageThreadShim({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-black/5 bg-white px-3 py-2">
        <strong className="min-w-0 flex-1 truncate text-base font-bold text-ink">{title}</strong>
      </div>
      <div className="px-3 py-2">
        <p className="rounded-xl bg-red-50 p-3 text-center text-xs font-medium text-red-600">
          {t('login_required', { defaultValue: 'Please log in' })}
        </p>
      </div>
    </div>
  )
}

function AddressPanel({
  order,
  tab,
  onSwitch,
}: {
  order: LineOrder
  tab: 'product' | 'shipping'
  onSwitch: (tab: 'product' | 'shipping') => void
}) {
  const { t } = useTranslation()
  const product = order.product as (LineOrder['product'] & {
    country?: { name?: string }
    city?: string
    address?: string
  }) | undefined
  const shipping = order.order?.shipping
  const shippingAvailable = shipping != null || order.noshipping === false

  return (
    <div className="border-b border-black/5 bg-mist px-3 py-2">
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => onSwitch('product')}
          className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
            tab === 'product' ? 'bg-primary text-white' : 'bg-black/5 text-ink'
          }`}
        >
          {t('product_address', { defaultValue: 'Product address' })}
        </button>
        {shippingAvailable && (
          <button
            type="button"
            onClick={() => onSwitch('shipping')}
            className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
              tab === 'shipping' ? 'bg-primary text-white' : 'bg-black/5 text-ink'
            }`}
          >
            {t('shipping_address', { defaultValue: 'Shipping address' })}
          </button>
        )}
      </div>

      <dl className="space-y-1 text-xs text-ink">
        {tab === 'product' && product ? (
          <>
            <Row label={t('address.country_name', { defaultValue: 'Country' })} value={product.country?.name} />
            <Row label={t('address.city', { defaultValue: 'City' })} value={product.city} />
            <Row label={t('address.address', { defaultValue: 'Address' })} value={product.address} />
          </>
        ) : tab === 'product' ? (
          <p className="text-ink-soft">{t('no_data', { defaultValue: 'No data' })}</p>
        ) : null}

        {tab === 'shipping' && shipping && (
          <>
            <Row label={t('address.name', { defaultValue: 'Name' })} value={shipping.name} />
            <Row label={t('address.country_name', { defaultValue: 'Country' })} value={shipping.country_name} />
            <Row label={t('address.city', { defaultValue: 'City' })} value={shipping.city} />
            <Row label={t('address.address', { defaultValue: 'Address' })} value={shipping.address} />
            <Row label={t('address.phone_number', { defaultValue: 'Phone number' })} value={shipping.phone_number} />
          </>
        )}
        {tab === 'shipping' && !shipping && order.shippingAddress && (
          <p className="text-ink">{order.shippingAddress}</p>
        )}
      </dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value || '-'}</dd>
    </div>
  )
}
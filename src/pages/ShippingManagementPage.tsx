import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { ChevronDown, Minus, Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LineOrder } from '../types'
import { fetchLineOrder, updateLineOrderShippingStatus } from '../lib/api'
import { formatAmount } from '../lib/format'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

type StepKey =
  | 'seller_to_deliver'
  | 'deliver_from_seller'
  | 'deliver_to_buyer'
  | 'buyer_from_deliver'
  | 'seller_to_buyer'
  | 'buyer_from_seller'

const STATUS_COLORS: Record<string, string> = {
  red: 'bg-red-500',
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  gray: 'bg-slate-400',
}

export default function ShippingManagementPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const lineOrderId = Number(id)
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)

  const [lineOrder, setLineOrder] = useState<LineOrder | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [productInfoOpen, setProductInfoOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const getLineOrder = useCallback(async () => {
    if (!lineOrderId || Number.isNaN(lineOrderId)) return
    setIsLoading(true)
    try {
      const res = await fetchLineOrder(token ?? undefined, lineOrderId)
      setLineOrder((res.line_order as LineOrder) ?? null)
    } catch {
      setLineOrder(null)
    } finally {
      setIsLoading(false)
    }
  }, [token, lineOrderId])

  useEffect(() => {
    if (isLoggedIn) void getLineOrder()
  }, [isLoggedIn, getLineOrder])

  const isBuyer = lineOrder?.order?.pi_users_id != null && lineOrder.order.pi_users_id === user?.id
  const isSeller = lineOrder?.product?.user != null && lineOrder.product.user.id === user?.id
  const isDeliver =
    lineOrder?.deliver_pi_users_id != null && lineOrder.deliver_pi_users_id === user?.id

  const confirmStep = (step: StepKey) => {
    void Swal.fire({
      title: t('info', { defaultValue: 'Info' }),
      html: `<img class="m-auto" src="/site_images/confirm.PNG" alt=""><br><strong style="font-size:20px;">${t(
        'confirmation.you_sure',
        { defaultValue: 'Are you sure?' },
      )}</strong>`,
      showCancelButton: true,
      confirmButtonColor: '#ec11b5',
      confirmButtonText: t('confirmation.yes_continue', { defaultValue: 'Yes, continue!' }),
      cancelButtonText: t('confirmation.no_cancel', { defaultValue: 'No, cancel' }),
    }).then(async (result) => {
      if (!result.isConfirmed || !lineOrder) return
      try {
        const res = await updateLineOrderShippingStatus(token ?? undefined, lineOrder.id, `${step}_at`)
        if (res.status === true) {
          const updated = (res.line_order as LineOrder | undefined) ?? null
          setLineOrder(updated)
          if (updated?.shipped_at) {
            void Swal.fire({
              icon: 'success',
              title: t('info', { defaultValue: 'Info' }),
              text: t('shipped_sucessfully', { defaultValue: 'Shipping done successfully' }),
              confirmButtonColor: '#ec11b5',
            })
          } else {
            void Swal.fire({
              icon: 'success',
              title: t('saved', { defaultValue: 'Saved' }),
              text: t('selected', { defaultValue: 'Selection done successfully' }),
              confirmButtonColor: '#ec11b5',
            })
          }
        } else {
          throw new Error(res.message)
        }
      } catch {
        void Swal.fire({
          icon: 'error',
          title: t('info', { defaultValue: 'Info' }),
          text: t('an_error_occured', { defaultValue: 'An error occurred' }),
          confirmButtonColor: '#ec11b5',
        })
      }
    })
  }

  type StepDef = {
    key: StepKey
    label: string
    addVisible: boolean
    toggleVisibleForRole: boolean
    disabled: boolean
    atValue: string | boolean | null | undefined
  }

  const buildSteps = (): StepDef[] => {
    const lo = lineOrder
    if (!lo) return []
    const notShipped = !lo.shipped_at
    if (lo.hasDeliver === true) {
      return [
        {
          key: 'seller_to_deliver',
          label: t('seller_to_deliver', { defaultValue: 'The seller gave the product to deliver' }),
          addVisible:
            notShipped && lo.order?.paid === true && isSeller && lo.seller_to_deliver_at == null,
          toggleVisibleForRole: isSeller,
          disabled: lo.order?.paid !== true || lo.hasAtLeastOneSellerToDeliverImage !== true,
          atValue: lo.seller_to_deliver_at,
        },
        {
          key: 'deliver_from_seller',
          label: t('deliver_from_seller', { defaultValue: 'The deliver received the product from the seller' }),
          addVisible:
            notShipped &&
            lo.seller_to_deliver_at != null &&
            lo.deliver_from_seller_at == null &&
            isDeliver,
          toggleVisibleForRole: isDeliver,
          disabled: lo.seller_to_deliver_at == null || lo.hasAtLeastOneDeliverFromSellerImage !== true,
          atValue: lo.deliver_from_seller_at,
        },
        {
          key: 'deliver_to_buyer',
          label: t('deliver_to_buyer', { defaultValue: 'The deliver gave the product to the buyer' }),
          addVisible:
            notShipped &&
            lo.deliver_from_seller_at != null &&
            lo.deliver_to_buyer_at == null &&
            isDeliver,
          toggleVisibleForRole: isDeliver,
          disabled: lo.seller_to_deliver_at == null || lo.hasAtLeastOneDeliverToBuyerImage !== true,
          atValue: lo.deliver_to_buyer_at,
        },
        {
          key: 'buyer_from_deliver',
          label: t('buyer_from_deliver', { defaultValue: 'The buyer has received the product from the delivery person' }),
          addVisible:
            notShipped &&
            lo.deliver_to_buyer_at != null &&
            lo.buyer_from_deliver_at == null &&
            isBuyer,
          toggleVisibleForRole: isBuyer,
          disabled: lo.deliver_to_buyer_at == null || lo.hasAtLeastOneBuyerFromDeliverImage !== true,
          atValue: lo.buyer_from_deliver_at,
        },
      ]
    }
    return [
      {
        key: 'seller_to_buyer',
        label: t('seller_to_buyer', { defaultValue: 'The seller gave the product to the buyer' }),
        addVisible:
          notShipped && lo.order?.paid === true && isSeller && lo.seller_to_buyer_at == null,
        toggleVisibleForRole: isSeller,
        disabled: lo.order?.paid !== true || lo.hasAtLeastOneSellerToBuyerImage !== true,
        atValue: lo.seller_to_buyer_at,
      },
      {
        key: 'buyer_from_seller',
        label: t('buyer_from_seller', { defaultValue: 'The buyer received the product from the seller' }),
        addVisible:
          notShipped && lo.seller_to_buyer_at != null && lo.buyer_from_seller_at == null && isBuyer,
        toggleVisibleForRole: isBuyer,
        disabled: lo.seller_to_buyer_at == null || lo.hasAtLeastOneBuyerFromSellerImage !== true,
        atValue: lo.buyer_from_seller_at,
      },
    ]
  }

  const renderStep = (step: StepDef) => {
    const lo = lineOrder
    if (!lo) return null
    const images = lo.shipping_images?.[step.key] ?? []
    const done = step.atValue != null
    return (
      <div key={step.key}>
        {step.addVisible && (
          <div className="flex justify-center pb-3">
            <button
              type="button"
              onClick={() =>
                navigate(`/add-update-shipping-images/${step.key}`, {
                  state: { lineOrderId: lo.id },
                })
              }
              className="rounded-xl bg-gradient-to-r from-primary to-primary-deep px-6 py-1.5 text-xs font-black uppercase text-white shadow-soft"
            >
              <Plus size={13} className="mr-1 inline" />
              {t('add', { defaultValue: 'Add' })}
            </button>
          </div>
        )}

        {images.length > 0 && (
          <div className="mb-3 flex flex-wrap justify-center gap-1.5 rounded-[10px] bg-slate-100 p-2.5">
            {images.map((im) => (
              <img
                key={im.id ?? im.lien}
                src={im.lien}
                alt=""
                onClick={() => setSelectedImage(im.lien)}
                className="h-[100px] w-[100px] cursor-pointer rounded-md object-cover"
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between py-1.5">
          <h5 className="text-sm font-semibold text-ink">{step.label}</h5>
          <div className="pr-2">
            {!done ? (
              step.toggleVisibleForRole ? (
                <button
                  type="button"
                  disabled={step.disabled}
                  onClick={() => confirmStep(step.key)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    step.disabled ? 'bg-slate-200' : 'bg-slate-300 hover:bg-slate-300/80'
                  }`}
                  aria-label={step.label}
                >
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition" />
                </button>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-500">
                  <Minus size={17} />
                </span>
              )
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-600 text-emerald-600">
                ✓
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 border-t border-slate-100" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return <LoginPanel />
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-xs text-ink-soft">
        <img src="/site_images/index_loader.gif" alt="" className="w-[70px] rounded-sm" />
        {t('loading', { defaultValue: 'loading' })}
      </div>
    )
  }

  if (!lineOrder) {
    return (
      <div className="flex justify-center py-12">
        <button
          type="button"
          onClick={() => void getLineOrder()}
          className="rounded-xl bg-gradient-to-r from-primary to-primary-deep px-6 py-2 text-xs font-black uppercase text-white shadow-soft"
        >
          {t('reload', { defaultValue: 'reload' })}
        </button>
      </div>
    )
  }

  const percent =
    typeof lineOrder.statusPercent === 'number'
      ? lineOrder.statusPercent === 0
        ? 10
        : lineOrder.statusPercent
      : (lineOrder.statusPercentDisplay ?? 10)
  const barColor = STATUS_COLORS[lineOrder.statusColor ?? ''] ?? 'bg-primary'
  const product = lineOrder.product
  const shipping = lineOrder.order?.shipping

  return (
    <div className="animate-fade-in">
      <section className="px-4 py-6">
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
          <img src="/site_images/shipping.jpg" alt="" className="mx-auto h-[150px] object-contain" />
          <div className="mt-3">
            <h4 className="font-bold text-ink">{t('status.text', { defaultValue: 'Status' })}</h4>
            <p className="mb-3 mt-1 text-xs font-medium text-primary">
              {t('shipping_completion_status', { defaultValue: 'Shipping completion status' })}
            </p>
            <div className="h-7 w-full overflow-hidden rounded-xl bg-slate-200">
              <div className={`h-full ps-3 leading-7 text-start text-xs font-semibold text-white ${barColor}`} style={{ width: `${percent}%` }}>
                {lineOrder.statusPercentDisplay ?? 0}%
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
          <button
            type="button"
            onClick={() => setProductInfoOpen((prev) => !prev)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="inline text-lg font-bold text-ink">
              {t('product_info', { defaultValue: 'Product info' })}
            </h2>
            <ChevronDown
              size={15}
              className={`transition ${productInfoOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {productInfoOpen && (
            <div className="px-1 pb-2 pt-3">
              {product && (
                <div className="flex gap-3">
                  <img
                    src={product.imageFirst}
                    alt=""
                    className="w-[120px] shrink-0 cursor-pointer rounded-lg object-cover"
                    onClick={() => navigate(`/product/${product.id}`)}
                  />
                  <div className="min-w-0 flex-1">
                    <h6 className="truncate text-sm font-medium text-ink">{product.libelle}</h6>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-yellow-600">
                        {formatAmount(lineOrder.price_converted ?? product.price, lineOrder.currency_conversion ?? product.currency)}
                      </span>
                      <span className="text-xs font-medium text-primary">
                        {lineOrder.quantity ?? 1}x Item
                      </span>
                    </div>
                    <p className="text-right text-sm font-semibold text-yellow-600">
                      {t('total_display', {
                        defaultValue: 'Total: {amount}',
                        amount: formatAmount(
                          (lineOrder.price_converted ?? product.price ?? 0) * (lineOrder.quantity ?? 1),
                          lineOrder.currency_conversion ?? product.currency,
                        ),
                      })}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-3 space-y-1 text-xs text-ink">
                <p>
                  <span className="font-semibold">{t('from', { defaultValue: 'From' })}: </span>
                  {product?.user?.shortShopname ?? product?.user?.username ?? ''}
                </p>
                <p>
                  <span className="font-semibold">{t('to', { defaultValue: 'To' })}: </span>
                  {lineOrder.noshipping === true
                    ? '----------'
                    : [shipping?.country_name, shipping?.city, shipping?.address]
                        .filter(Boolean)
                        .join('/')}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
          <h3 className="font-bold text-ink">{t('confirmation_text', { defaultValue: 'Confirmation' })}</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            {t('shipping_status_confirmation', { defaultValue: 'Shipping status and confirmation.' })}
          </p>
          {isBuyer && (
            <p className="mt-1 text-xs text-ink">{t('you_the_buyer', { defaultValue: "You're the buyer" })}</p>
          )}
          {isSeller && (
            <p className="mt-1 text-xs text-ink">{t('you_the_seller', { defaultValue: "You're the seller" })}</p>
          )}
          {isDeliver && (
            <p className="mt-1 text-xs text-ink">{t('you_the_deliver', { defaultValue: "You're the deliver" })}</p>
          )}

          <div className="mt-4">{buildSteps().map(renderStep)}</div>
        </div>
      </section>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-red-500"
            aria-label={t('close', { defaultValue: 'Close' })}
          >
            <X size={26} />
          </button>
          <img src={selectedImage} alt="" className="max-h-[97%] w-full object-contain" />
        </div>
      )}
    </div>
  )
}

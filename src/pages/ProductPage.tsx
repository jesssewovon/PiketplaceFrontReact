import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import {
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  PackagePlus,
  Pencil,
  Plus,
  Rocket,
  Share2,
  Star,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BoostPeriod, CancellationReason, Product, ProductDetailResponse } from '../types'
import {
  addStock,
  addToCart,
  boostProduct,
  deleteProduct as apiDeleteProduct,
  fetchProduct,
  isEmail,
  postComment,
  updateProductVisibility,
  updatePromotionActivation,
  upgradeBoostProduct,
  validateProduct,
} from '../lib/api'
import { formatAmount, formatDate } from '../lib/format'
import { flagEmoji } from '../lib/geo'
import { useAppSelector } from '../store/hooks'
import { initPi, waitForPi } from '../lib/pi'
import { postPiPayment } from '../lib/api'

function sanitizeAmount(raw: string): string {
  let value = raw.replace(/[^\d.]/g, '')
  const dots = value.match(/\./g)
  if (dots && dots.length > 1) {
    value = value.replace(/\.$/, '')
  }
  const [whole, fraction] = value.split('.')
  if (fraction && fraction.length > 7) {
    value = `${whole}.${fraction.slice(0, 7)}`
  }
  return value
}

function isDecimalNotZero(value: string): boolean {
  if (!/^\d+(\.\d+)?$/.test(value)) return false
  return Number(value) > 0
}

function PositionPreview({
  image,
  position,
}: {
  image?: string
  position?: number
}) {
  const pos = position ?? 0
  const indexShow = pos > 0 && pos <= 5 ? pos : 3
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-[18%]">
          <div className="flex h-[50px] items-center justify-center overflow-hidden rounded-[10px] border-2 border-slate-200 bg-slate-100">
            {i === indexShow && image && (
              <img src={image} alt="" className="h-full w-full rounded-[10%] object-cover" />
            )}
          </div>
          <p className="mt-1 text-center text-[10px] text-ink-soft">
            {pos > 0 && pos <= 5 ? i : i === 1 ? i : i === indexShow ? pos : '...'}
          </p>
        </div>
      ))}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'

const labelClass = 'mb-1.5 block text-xs font-semibold text-ink-soft'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)
  const permissions = useAppSelector((state) => state.auth.permissions)
  const settings = useAppSelector((state) => state.settings.settings)
  const reasonsAttr = useAppSelector((state) => state.attributes.reasons)

  const productId = Number(id)
  const locale = i18n.language.split('-')[0]
  const canValidate = Array.isArray(permissions) && permissions.includes('validate_products')
  const purchaseActivation = settings?.purchase_activation !== false
  const purchaseFromCart =
    typeof settings?.purchase_from_cart_activate === 'boolean'
      ? (settings.purchase_from_cart_activate as boolean)
      : false
  const walletUrl =
    typeof settings?.piket_wallet_frontend_url === 'string'
      ? (settings.piket_wallet_frontend_url as string)
      : null

  const reasons: CancellationReason[] = useMemo(() => {
    if (!reasonsAttr || typeof reasonsAttr !== 'object') return []
    const byLocale = reasonsAttr as Record<string, CancellationReason[] | undefined>
    const list = byLocale[locale] ?? byLocale.en ?? []
    return Array.isArray(list) ? list : []
  }, [reasonsAttr, locale])

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [productUnavailable, setProductUnavailable] = useState(false)
  const [approbationActive, setApprobationActive] = useState(false)
  const [deletionActive, setDeletionActive] = useState(false)
  const [updateActive, setUpdateActive] = useState(false)
  const [boostPeriods, setBoostPeriods] = useState<BoostPeriod[]>([])
  const [qty, setQty] = useState(1)
  const [email, setEmail] = useState('')
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isCommenting, setIsCommenting] = useState(false)

  const [showBoostPanel, setShowBoostPanel] = useState(false)
  const [showPromotionPanel, setShowPromotionPanel] = useState(false)
  const [isUpgrade, setIsUpgrade] = useState(false)
  const [alreadyBoosted, setAlreadyBoosted] = useState(false)
  const [boostChecked, setBoostChecked] = useState(false)
  const [globalPosition, setGlobalPosition] = useState(0)
  const [countryPosition, setCountryPosition] = useState(0)
  const [upgradePositions, setUpgradePositions] = useState<{ global: number; country: number }>({
    global: 0,
    country: 0,
  })
  const [boostForm, setBoostForm] = useState({ amount: '', currencies_code: '', period: '' })
  const [walletOpen, setWalletOpen] = useState(false)

  const [promotionEnabled, setPromotionEnabled] = useState(false)
  const [promotionPercentage, setPromotionPercentage] = useState('')

  const [stockOpen, setStockOpen] = useState(false)
  const [stockQuantity, setStockQuantity] = useState('')

  const [reasonsOpen, setReasonsOpen] = useState(false)
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = Boolean(isLoggedIn && user && product && user.id === product.pi_users_id)

  const setPositionFromData = (data: Partial<ProductDetailResponse>) => {
    if (data.boostPositionCheck) {
      setGlobalPosition(data.boostPositionCheck.global_position ?? 0)
      setCountryPosition(data.boostPositionCheck.country_position ?? 0)
    } else if (data.boostPosition) {
      setGlobalPosition(data.boostPosition.global_position ?? 0)
      setCountryPosition(data.boostPosition.country_position ?? 0)
    }
  }

  const loadProduct = useCallback(async () => {
    if (!productId || Number.isNaN(productId)) {
      setNotFound(true)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setNotFound(false)
    setProductUnavailable(false)
    try {
      const data = await fetchProduct(productId, isLoggedIn ? (token ?? undefined) : undefined)
      if (data.status && data.product) {
        setProduct(data.product)
        setApprobationActive(Boolean(data.approbation_active))
        setDeletionActive(Boolean(data.deletion_active))
        setUpdateActive(Boolean(data.update_active))
        setBoostPeriods(data.boost_periods ?? [])
        setAlreadyBoosted(Boolean(data.product.last_boost))
        setPositionFromData(data)
        if (user?.email) setEmail(user.email)
      } else if (data.message === 'product_not_validated') {
        setProductUnavailable(true)
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setIsLoading(false)
    }
  }, [productId, isLoggedIn, token, user?.email])

  useEffect(() => {
    void loadProduct()
  }, [loadProduct])

  useEffect(() => {
    if (product) {
      setPromotionEnabled(product.promotion_fees_activated === true)
      setPromotionPercentage(product.promotion_fees_percentage?.toString() ?? '')
    }
  }, [product])

  const showError = (text: string) => {
    void Swal.fire({
      icon: 'error',
      title: t('info', { defaultValue: 'Info' }),
      text,
      confirmButtonColor: '#ec11b5',
    })
  }

  const showSuccess = (text: string) => {
    void Swal.fire({
      icon: 'success',
      title: t('info', { defaultValue: 'Info' }),
      text,
      confirmButtonColor: '#ec11b5',
    })
  }

  const confirmLogin = () => {
    void Swal.fire({
      icon: 'warning',
      title: t('connection', { defaultValue: 'Connection' }),
      text: t('log_in_first', { defaultValue: 'Log in first' }),
      confirmButtonColor: '#ec11b5',
    })
  }

  const shareProduct = () => {
    if (!product) return
    const base = typeof settings?.pi_net_url === 'string' ? (settings.pi_net_url as string) : ''
    let productLink = `${base}/product/${product.id}`
    if (product.promotion_fees_activated === true && !isOwner && user?.id) {
      productLink += `?referrer=${user.id}`
    }
    const description = (product.description ?? '').replace(/[\r\n]+/g, ' ')
    const data = { product_name: product.libelle, description, product_link: productLink }
    const message = isOwner
      ? t('my_product_link_message_to_share', data)
      : t('product_link_message_to_share', data)
    const title = t('sharing_product_link', { defaultValue: 'Sharing product link' })
    window.Pi?.openShareDialog(title, message)
  }

  const preComment = () => {
    if (!isLoggedIn) {
      confirmLogin()
      return
    }
    setCommentText('')
    setCommentOpen(true)
  }

  const submitComment = async () => {
    if (!product) return
    if (!isLoggedIn) {
      confirmLogin()
      return
    }
    if (/\d/.test(commentText)) {
      showError(t('comment.comment_no_contains_number', { defaultValue: 'Comment should not contain numbers' }))
      return
    }
    if (commentText.search(/([^.@\s]+)(\.[^.@\s]+)*@([^.@\s]+)/) !== -1) {
      showError(t('comment.comment_no_contains_number', { defaultValue: 'Comment should not contain numbers' }))
      return
    }
    if (commentText.trim() === '') return
    setIsCommenting(true)
    try {
      const res = await postComment(token ?? undefined, {
        comment: commentText,
        products_id: product.id,
        pi_users_id: user?.id,
      })
      setIsCommenting(false)
      if (res.status === true) {
        if (res.product) setProduct(res.product)
        setCommentOpen(false)
        setCommentText('')
        showSuccess(t('commented_successfully', { defaultValue: 'Commented successfully' }))
      } else if (res.message === 'product_not_validated') {
        showError(t('cannot_comment_unvalidated_product', { defaultValue: 'You cannot comment on an unvalidated product.' }))
      } else {
        showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
      }
    } catch {
      setIsCommenting(false)
      showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
    }
  }

  const axiosAdding = async (isBuyNow: boolean) => {
    if (!product) return
    if (!isLoggedIn) {
      confirmLogin()
      return
    }
    if (!purchaseActivation) {
      showError(t('purchase_deactivated', { defaultValue: 'Purchasing is temporarily deactivated' }))
      return
    }
    if (product.is_digital && (!email || !isEmail(email))) {
      showError(t('email_required_with_format', { defaultValue: 'E-mail required with email format' }))
      return
    }
    let zone = ''
    if (product.is_digital) {
      zone = 'true'
    } else if (isBuyNow) {
      zone = 'false'
    }
    try {
      const res = await addToCart(token ?? undefined, {
        products_id: product.id,
        username: user?.username,
        quantity: isBuyNow ? qty : qty,
        in_free_shipping_zone: zone,
        in_paid_shipping_zone: 'no',
      })
      if (String(res.status) === 'success' || res.status === true) {
        if (isBuyNow) {
          await Swal.fire({
            icon: 'success',
            title: t('info', { defaultValue: 'Info' }),
            text: t('cart.added_to_cart', { defaultValue: 'Added to cart' }),
            confirmButtonColor: '#ec11b5',
          })
          navigate('/')
        } else {
          showSuccess(t('cart.added_to_cart', { defaultValue: 'Added to cart' }))
        }
      } else {
        showError(
          typeof res.message === 'string'
            ? t(res.message, { defaultValue: res.message })
            : t('an_error_occured', { defaultValue: 'An error occurred' }),
        )
      }
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : t('an_error_occured', { defaultValue: 'An error occurred' }),
      )
    }
  }

  const toggleVisibility = async () => {
    if (!product) return
    const action = product.visible
      ? t('you_going_hide_product', { defaultValue: 'You are going to hide this product' })
      : t('you_going_display_product', { defaultValue: 'You are going to display this product' })
    const result = await Swal.fire({
      icon: 'question',
      title: t('info', { defaultValue: 'Info' }),
      text: action,
      showCancelButton: true,
      confirmButtonText: t('yes', { defaultValue: 'Yes' }),
      cancelButtonText: t('no', { defaultValue: 'No' }),
      confirmButtonColor: '#ec11b5',
    })
    if (!result.isConfirmed) return
    try {
      const res = await updateProductVisibility(token ?? undefined, product.id)
      if (res.status === true && res.product) {
        setProduct(res.product as Product)
        showSuccess(
          (res.product as Product).visible
            ? t('product_visible_now', { defaultValue: 'Product is now visible' })
            : t('product_hidden_now', { defaultValue: 'Product is now hidden' }),
        )
      } else if (res.message === 'has_precommand') {
        const confirmation = await Swal.fire({
          icon: 'warning',
          title: t('info', { defaultValue: 'Info' }),
          text: `${t('this_product_contains_precommands', { defaultValue: 'This product contains precommands.' })} ${t('cancel_precommands_and_hide', { defaultValue: 'Cancel precommands and hide' })}`,
          showCancelButton: true,
          confirmButtonText: t('continue', { defaultValue: 'Continue' }),
          cancelButtonText: t('confirmation.no_cancel', { defaultValue: 'No, cancel' }),
          confirmButtonColor: '#ec11b5',
        })
        if (confirmation.isConfirmed) {
          const res2 = await updateProductVisibility(token ?? undefined, product.id, true)
          if (res2.product) setProduct(res2.product as Product)
        }
      } else {
        showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
      }
    } catch {
      showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
    }
  }

  const confirmDeleteProduct = async () => {
    if (!product) return
    const result = await Swal.fire({
      title: t('suppression', { defaultValue: 'Suppression' }),
      html: `<img class="m-auto" src="/site_images/confirm.PNG" alt=""><br><strong style="font-size:20px;">${t('confirmation.you_sure', {
        defaultValue: 'Are you sure?',
      })}</strong>`,
      showCancelButton: true,
      confirmButtonText: t('yes', { defaultValue: 'Yes' }),
      cancelButtonText: t('no', { defaultValue: 'No' }),
      confirmButtonColor: '#ec11b5',
    })
    if (!result.isConfirmed) return
    setIsDeleting(true)
    try {
      const res = await apiDeleteProduct(token ?? undefined, product.id)
      setIsDeleting(false)
      if (res.status === true) {
        await Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('deleted_successfull', { defaultValue: 'Deleted successfully' }),
          confirmButtonColor: '#ec11b5',
        })
        navigate(-1)
      } else {
        showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
      }
    } catch {
      setIsDeleting(false)
      showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
    }
  }

  const submitBoost = async (status: string, codePin = '') => {
    if (!product) return
    if (!isDecimalNotZero(boostForm.amount)) {
      showError(t('numeric_value_required_for_amount', { defaultValue: 'Numeric value required for amount' }))
      return
    }
    if (boostForm.currencies_code === '' && boostForm.period === '') {
      showError(t('fill_all_fields', { defaultValue: 'Please fill all fields' }))
      return
    }
    setIsSaving(true)
    const payload = {
      amount: boostForm.amount,
      currencies_code: boostForm.currencies_code,
      period: boostForm.period,
      products_id: product.id,
      status,
      code_pin: codePin,
    }
    try {
      const res = isUpgrade
        ? await upgradeBoostProduct(token ?? undefined, payload)
        : await boostProduct(token ?? undefined, payload)
      setIsSaving(false)
      if (res.status && res.product) {
        setProduct(res.product)
        setPositionFromData(res)
        if (status === 'check') {
          setBoostChecked(true)
          setUpgradePositions({
            global: res.boostPositionCheck?.global_position ?? 0,
            country: res.boostPositionCheck?.country_position ?? 0,
          })
        } else {
          setAlreadyBoosted(true)
          setIsUpgrade(false)
          setShowBoostPanel(false)
          await Swal.fire({
            icon: 'success',
            title: t('info', { defaultValue: 'Info' }),
            text: isUpgrade
              ? t('boost_upgraded_successfully', { defaultValue: 'Boost upgraded successfully' })
              : t('boosted_successfully', { defaultValue: 'Boosted successfully' }),
            confirmButtonColor: '#ec11b5',
          })
          navigate('/')
        }
      } else if (res.message && res.message !== '') {
        const opts: Record<string, string> = {}
        if (res.amount_min_required && res.currencies_code) {
          opts.amount = formatAmount(res.amount_min_required, res.currencies_code)
        }
        showError(t(res.message, { defaultValue: res.message, ...opts }))
      } else {
        showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
      }
    } catch {
      setIsSaving(false)
      showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
    }
  }

  const payWith = () => {
    if (boostForm.currencies_code === 'piket') {
      void askPinAndBoost()
      return
    }
    setWalletOpen(true)
  }

  const askPinAndBoost = async () => {
    const result = await Swal.fire({
      title: t('info', { defaultValue: 'Info' }),
      html: `<span class="font-900 font-16">${t('put_your_code_pin', {
        defaultValue: 'Put your code PIN',
      })}</span><br><br>${t('create_your_code_pin', {
        defaultValue: 'Create your code PIN on',
      })}<i class="fa fa-hand-point-right me-1 ms-1"></i><a style="color: darkblue" href="${
        walletUrl ?? '#'
      }" target="_blank">Piket Wallet</a><br><br>`,
      input: 'password',
      showCancelButton: true,
      confirmButtonText: t('confirmation.yes_continue', { defaultValue: 'Yes, continue!' }),
      cancelButtonText: t('confirmation.no_cancel', { defaultValue: 'No, cancel' }),
      confirmButtonColor: '#ec11b5',
    })
    if (result.isConfirmed && result.value) {
      await submitBoost('continue', String(result.value))
    }
  }

  const payWithPiNetwork = async () => {
    if (!product) return
    setWalletOpen(false)
    const uniqueId = crypto.randomUUID()
    const memo = isUpgrade
      ? t('boost_upgrade', { defaultValue: 'Boost upgrade' })
      : t('boost_for_on', {
          defaultValue: 'Boost for {amount} on a {period}',
          amount: `${boostForm.amount} pi`,
          period: t(boostForm.period, { defaultValue: boostForm.period }),
        })
    const metadata: Record<string, unknown> = {
      uniqueId,
      userId: user?.id,
      products_id: product.id,
      ...(isUpgrade
        ? { type: 'product_boost_upgrade' }
        : { type: 'product_boost', period: boostForm.period }),
    }
    try {
      await waitForPi()
      initPi()
      if (!window.Pi) throw new Error('Pi SDK is not available')
      const onIncompletePaymentFound = (payment: unknown) => {
        const p = payment as { identifier?: string; transaction?: { txid?: string } }
        if (!p.identifier || !p.transaction?.txid) return
        void postPiPayment(token ?? undefined, user?.uid, 'incomplete', {
          paymentId: p.identifier,
          txid: p.transaction.txid,
        }).catch(() => undefined)
      }
      await window.Pi.authenticate(['username', 'payments'], onIncompletePaymentFound).catch(() => undefined)
      window.Pi.createPayment(
        { amount: Number(boostForm.amount), memo, metadata },
        {
          onReadyForServerApproval: (paymentId) =>
            postPiPayment(token ?? undefined, user?.uid, 'approve', { paymentId }),
          onReadyForServerCompletion: (paymentId, txid) =>
            postPiPayment(token ?? undefined, user?.uid, 'complete', { paymentId, txid }).then(() => {
              void submitBoost('continue')
            }),
          onCancel: () => undefined,
          onError: () => undefined,
        },
      )
    } catch {
      showError(t('please_use_pi_browser', { defaultValue: 'Please use the Pi browser' }))
    }
  }

  const savePromotionActivation = async () => {
    if (!product) return
    setIsSaving(true)
    try {
      const res = await updatePromotionActivation(token ?? undefined, {
        ...product,
        promotion_fees_activated: promotionEnabled,
        promotion_fees_percentage: Number(promotionPercentage),
      })
      setIsSaving(false)
      if (res.status === true && res.product) {
        setProduct(res.product)
        showSuccess(t('saved', { defaultValue: 'Saved' }))
      } else if (res.message) {
        showError(res.message)
      } else {
        showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
      }
    } catch {
      setIsSaving(false)
      showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
    }
  }

  const openAddStock = () => {
    setStockQuantity('')
    setStockOpen(true)
  }

  const sendStockRequest = async () => {
    if (!product) return
    const quantity = parseFloat(stockQuantity)
    if (!quantity || quantity === 0) {
      showError(t('quantity_required', { defaultValue: 'Quantity is required' }))
      return
    }
    setIsSaving(true)
    try {
      const res = await addStock(token ?? undefined, product.id, quantity)
      setIsSaving(false)
      if (res.status === true && res.product) {
        setProduct(res.product as Product)
        setStockOpen(false)
        showSuccess(t('stock_added_successfully', { defaultValue: 'Stock added successfully' }))
      } else {
        showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
      }
    } catch {
      setIsSaving(false)
      showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
    }
  }

  const handleValidateProduct = (status: string) => {
    if (status === 'rejected') {
      setSelectedReasons([])
      setReasonsOpen(true)
      return
    }
    void Swal.fire({
      html: `<img class="m-auto" src="/site_images/info.PNG" alt=""><br><strong style="font-size:20px;">${t('confirmation.you_sure', {
        defaultValue: 'Are you sure?',
      })}</strong>`,
      showCancelButton: true,
      confirmButtonText: t('yes', { defaultValue: 'Yes' }),
      cancelButtonText: t('no', { defaultValue: 'No' }),
      confirmButtonColor: '#ec11b5',
    }).then(async (result) => {
      if (result.isConfirmed) {
        await sendValidation('validated')
      }
    })
  }

  const sendValidation = async (status: string, codes?: string[]) => {
    if (!product) return
    setIsSaving(true)
    try {
      const res = await validateProduct(token ?? undefined, product.id, status, codes)
      setIsSaving(false)
      if (res.status) {
        if (res.message === 'already_validated') {
          showSuccess(t('already_validated', { defaultValue: 'Already validated' }))
        } else if (res.message === 'already_rejected') {
          showSuccess(t('already_rejected', { defaultValue: 'Already rejected' }))
        } else {
          showSuccess(t('saved', { defaultValue: 'Saved' }))
        }
      } else {
        showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
      }
    } catch {
      setIsSaving(false)
      showError(t('an_error_occured', { defaultValue: 'An error occurred' }))
    }
  }

  const updateReasons = () => {
    setReasonsOpen(false)
    void sendValidation('rejected', selectedReasons)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-xs text-ink-soft">
        <img src="/site_images/index_loader.gif" alt="" className="w-[70px] rounded-sm" />
        {t('loading', { defaultValue: 'loading' })}
      </div>
    )
  }

  if (notFound || productUnavailable) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-xs text-ink-soft">
        {notFound ? (
          <>
            <p className="text-sm font-medium text-ink">
              {t('product_not_found', { defaultValue: 'Product not found' })}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-ink">
              {t('product_unavailable', { defaultValue: 'Product unavailable' })}
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
            >
              {t('home', { defaultValue: 'Home' })}
            </button>
          </>
        )}
      </div>
    )
  }

  if (!product) return null

  const image = product.imageFirst ?? product.images?.[0]?.lien
  const outOfStock = !product.is_digital && (product.quantity === 0 || product.quantity == null)
  const rejectedReasons =
    product.last_validation?.status === 'rejected' && (product.last_validation.reasons?.length ?? 0) > 0
      ? (product.last_validation.reasons ?? []).map((code) => {
          const match = reasons.find((r) => r.code === code)
          return match?.text ?? String(code)
        })
      : []

  return (
    <div className="animate-fade-in">
      <section className="px-4 pb-6 pt-3">
        {canValidate && product.status !== 'rejected' && (
          <div className="mb-2 flex gap-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleValidateProduct('rejected')}
              className="text-red-600"
            >
              <Trash2 size={15} className="mr-1 inline" />
              {t('validate_reject', { defaultValue: 'Reject product' })}
            </button>
            {product.status !== 'validated' && (
              <button
                type="button"
                onClick={() => handleValidateProduct('validated')}
                className="text-green-600"
              >
                <Star size={15} className="mr-1 inline" />
                {t('validate_approve', { defaultValue: 'Validate product' })}
              </button>
            )}
          </div>
        )}

        {isOwner && (
          <div className="mb-2 flex flex-wrap gap-3 text-xs font-semibold">
            <button type="button" onClick={() => void toggleVisibility()} className="text-ink">
              {product.visible ? <EyeOff size={14} className="mr-1 inline" /> : <Eye size={14} className="mr-1 inline" />}
              {t(product.visible ? 'hide' : 'display', { defaultValue: product.visible ? 'Hide' : 'Display' })}
            </button>
            {updateActive && (
              <Link to="/publish" className="text-green-600">
                <Pencil size={14} className="mr-1 inline" />
                {t('update_product', { defaultValue: 'Update product' })}
              </Link>
            )}
            {deletionActive && (
              <button type="button" onClick={() => void confirmDeleteProduct()} className="text-red-600">
                <Trash2 size={14} className="mr-1 inline" />
                {t('delete', { defaultValue: 'Delete' })}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowBoostPanel((v) => !v)
                if (showPromotionPanel) setShowPromotionPanel(false)
              }}
              className="text-sky-600"
            >
              <Rocket size={14} className="mr-1 inline" />
              {t('boost', { defaultValue: 'Boost' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPromotionPanel((v) => !v)
                if (showBoostPanel) setShowBoostPanel(false)
              }}
              className="text-gray-600"
            >
              <Star size={14} className="mr-1 inline" />
              {t('activate promotion', { defaultValue: 'Activate promotion' })}
            </button>
            <button type="button" onClick={openAddStock} className="text-orange-500">
              <Plus size={14} className="mr-1 inline" />
              {t('update_the_stock', { defaultValue: 'Update the stock' })}
            </button>
          </div>
        )}

        {isOwner && product.status === 'rejected' && rejectedReasons.length > 0 && (
          <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 p-4">
            <h2 className="text-sm font-bold text-ink">
              {t('product_rejected_for_reasons', { defaultValue: 'Product disapproved for following reasons' })}
            </h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-ink">
              {rejectedReasons.map((reason, i) => (
                <li key={i} className="text-black">
                  {reason}
                </li>
              ))}
            </ul>
            {updateActive && (
              <Link
                to="/publish"
                className="mt-3 inline-block rounded-lg bg-gradient-to-r from-primary to-primary-deep px-4 py-2 text-xs font-bold text-white"
              >
                {t('update_product', { defaultValue: 'Update product' })}
              </Link>
            )}
          </div>
        )}

        {isOwner && showBoostPanel && (
          <div className="mb-3 rounded-2xl border border-black/5 bg-white p-4 shadow-soft">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
              <Rocket size={16} />
              {t('boost', { defaultValue: 'Boost' })}
            </p>

            {alreadyBoosted && product.last_boost && !isUpgrade ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">
                  {t('boost_for_on', {
                    defaultValue: 'Boost for {amount} on a {period}',
                    amount: formatAmount(product.last_boost.amount, product.last_boost.currencies_code),
                    period: t(product.last_boost.period ?? '', { defaultValue: product.last_boost.period ?? '' }),
                  })}
                </p>
                {product.last_boost.boost_ends_at && (
                  <p className="text-[11px] text-primary">
                    {t('expires_on', {
                      defaultValue: 'Expires on {date}',
                      date: formatDate(product.last_boost.boost_ends_at),
                    })}
                  </p>
                )}
                <p className="text-xs font-semibold text-ink">
                  <GlobeIcon /> {t('global_display_position', { defaultValue: 'Global display position' })}
                </p>
                <PositionPreview image={image} position={globalPosition} />
                <p className="text-xs font-semibold text-ink">
                  {flagEmoji(product.country_code ?? '')}{' '}
                  {t('country_display_position', { defaultValue: 'Country display position' })}
                </p>
                <PositionPreview image={image} position={countryPosition} />
                <button
                  type="button"
                  onClick={() => setIsUpgrade(true)}
                  className="mt-2 rounded-lg bg-gradient-to-r from-primary to-primary-deep px-3 py-1.5 text-xs font-bold text-white"
                >
                  {t('boost_upgrade', { defaultValue: 'Boost upgrade' })}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {isUpgrade && (
                  <p className="text-center text-sm font-bold text-ink">
                    {t('boost_upgrade', { defaultValue: 'Boost upgrade' })}
                  </p>
                )}
                <div className="flex gap-3">
                  <div className="w-1/2">
                    <label className={labelClass}>{t('amount', { defaultValue: 'Amount' })}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={40}
                      value={boostForm.amount}
                      onChange={(e) => {
                        setBoostForm((prev) => ({ ...prev, amount: sanitizeAmount(e.target.value) }))
                        setBoostChecked(false)
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div className="w-1/2">
                    <label className={labelClass}>{t('select', { defaultValue: 'Select' })}</label>
                    <select
                      value={boostForm.currencies_code}
                      onChange={(e) => {
                        setBoostForm((prev) => ({ ...prev, currencies_code: e.target.value }))
                        setBoostChecked(false)
                      }}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        {t('select', { defaultValue: 'Select' })}
                      </option>
                      <option value="pi">Pi</option>
                      <option value="piket">Piket</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t('select', { defaultValue: 'Select' })}</label>
                  <select
                    value={boostForm.period}
                    onChange={(e) => {
                      setBoostForm((prev) => ({ ...prev, period: e.target.value }))
                      setBoostChecked(false)
                    }}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      {t('select', { defaultValue: 'Select' })}
                    </option>
                    {boostPeriods.map((bp) => (
                      <option key={bp.id ?? bp.id} value={bp.id ?? ''}>
                        {t(bp.id ?? '', { defaultValue: bp.id ?? '' })}
                      </option>
                    ))}
                  </select>
                </div>

                {isUpgrade && boostChecked && upgradePositions.global > 0 && upgradePositions.country > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-ink">
                      <GlobeIcon /> {t('global_display_position', { defaultValue: 'Global display position' })}
                    </p>
                    <PositionPreview image={image} position={upgradePositions.global} />
                    <p className="text-xs font-semibold text-ink">
                      {flagEmoji(product.country_code ?? '')}{' '}
                      {t('country_display_position', { defaultValue: 'Country display position' })}
                    </p>
                    <PositionPreview image={image} position={upgradePositions.country} />
                  </div>
                )}

                {!isUpgrade && boostChecked && globalPosition > 0 && countryPosition > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-ink">
                      <GlobeIcon /> {t('global_display_position', { defaultValue: 'Global display position' })}
                    </p>
                    <PositionPreview image={image} position={globalPosition} />
                    <p className="text-xs font-semibold text-ink">
                      {flagEmoji(product.country_code ?? '')}{' '}
                      {t('country_display_position', { defaultValue: 'Country display position' })}
                    </p>
                    <PositionPreview image={image} position={countryPosition} />
                  </div>
                )}

                {product.status === 'pending' && (
                  <p className="text-xs text-red-700">
                    {t('product_pending', { defaultValue: 'Product pending validation' })}
                  </p>
                )}
                {product.status === 'rejected' && (
                  <p className="text-xs text-red-700">
                    {t('product_rejected', { defaultValue: 'Product rejected' })}
                  </p>
                )}
                {!product.visible && (
                  <p className="text-xs text-red-700">
                    {t('product_is_hidden', { defaultValue: 'This product is hidden' })}
                  </p>
                )}
                {!product.is_digital && product.quantity === 0 && (
                  <p className="text-xs text-red-700">
                    {t('no_stock_for_product', { defaultValue: 'No stock for this product' })}
                  </p>
                )}

                <div className="flex gap-2">
                  {isUpgrade && (
                    <button
                      type="button"
                      onClick={() => setIsUpgrade(false)}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-ink-soft transition hover:bg-slate-50"
                    >
                      {t('cancel', { defaultValue: 'Cancel' })}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void submitBoost('check')}
                    className="flex-1 rounded-xl border-2 border-primary px-4 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/5 disabled:opacity-60"
                  >
                    {t('check', { defaultValue: 'Check' })}
                  </button>
                </div>
                {boostChecked && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={payWith}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-xs font-bold text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
                  >
                    {isSaving && <Loader2 size={15} className="animate-spin" />}
                    {t('continue', { defaultValue: 'Continue' })}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {isOwner && showPromotionPanel && (
          <div className="mb-3 rounded-2xl border border-black/5 bg-white p-4 shadow-soft">
            <p className="mb-3 text-sm font-bold text-primary">
              {t('promotion activation', { defaultValue: 'Promotion activation' })}
            </p>
            <p className="mb-3 rounded-xl bg-[khaki] p-3 text-xs leading-relaxed text-black">
              {t('promotion_text_explanation', {
                defaultValue: 'Activating a promotion allows you to offer a percentage discount to users.',
              })}
            </p>
            <label className="mb-2 flex items-center gap-2.5 text-xs font-medium text-ink">
              <input
                type="checkbox"
                checked={promotionEnabled}
                onChange={(e) => setPromotionEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#ec11b5]"
              />
              {t(
                promotionEnabled ? 'deactivate promotion' : 'activate promotion',
                { defaultValue: promotionEnabled ? 'Deactivate promotion' : 'Activate promotion' },
              )}
            </label>
            {promotionEnabled && (
              <div className="mb-3">
                <label className={labelClass}>
                  {t('promotion fees percentage', { defaultValue: 'Promotion fees percentage (%)' })}
                </label>
                <input
                  type="number"
                  value={promotionPercentage}
                  onChange={(e) => setPromotionPercentage(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void savePromotionActivation()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-xs font-bold text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
            >
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              {t('profilForm.save', { defaultValue: 'Save' })}
            </button>
          </div>
        )}

        {image && (
          <div className="mb-7 overflow-hidden rounded-2xl border border-black/5 shadow-soft">
            <img src={image} alt={product.libelle} className="w-full" />
          </div>
        )}

        <div className="-mt-4 w-full rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <Link
              to={`/store/${product.user?.id ?? ''}`}
              className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-ink"
            >
              {product.user?.avatar && (
                <img
                  src={product.user.avatar}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover"
                />
              )}
              <span className="truncate">{product.user?.shopNameShow ?? product.user?.username ?? ''}</span>
              {product.country_code && <span>{flagEmoji(product.country_code)}</span>}
            </Link>
          </div>
          <h1 className="mt-2 text-xl font-semibold leading-6 text-ink">{product.libelle}</h1>
          <p className="mt-2 text-sm opacity-70">{product.description}</p>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-black text-ink">
              {formatAmount(product.price, product.currency)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={preComment}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-primary shadow-xl"
                aria-label={t('comment.comment', { defaultValue: 'Comment' })}
              >
                <MessageSquare size={14} />
              </button>
              <button
                type="button"
                onClick={shareProduct}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-primary shadow-xl"
                aria-label={t('share', { defaultValue: 'Share' })}
              >
                <Share2 size={14} />
              </button>
            </div>
          </div>

          {product.promotion_fees_activated && (
            <div className="my-3 rounded-xl bg-[#f9e4ed] p-3 text-center text-sm leading-relaxed text-ink">
              {t('share and get percentage after sale with your link', {
                defaultValue: 'Share {icon} and get {percentage}% of commission after sale with your link',
                icon: <Share2 size={14} className="inline text-primary" />,
                percentage: String(product.promotion_fees_percentage ?? ''),
              })}
            </div>
          )}

          <div className="my-3 h-px bg-black/5" />

          {!product.is_digital && (
            <span className="text-[10px] font-medium" style={{ color: '#dfa631' }}>
              {outOfStock && <span className="mr-1 text-red-600">!</span>}
              {t('instock', { quantity: product.quantity ?? 0, defaultValue: '{quantity} in stock' })}
              {isOwner && outOfStock && (
                <button
                  type="button"
                  onClick={openAddStock}
                  className="ml-2 rounded bg-gradient-to-r from-primary to-primary-deep px-1.5 py-0.5 text-[10px] font-bold text-white"
                >
                  <Plus size={10} className="inline" />
                </button>
              )}
            </span>
          )}

          {!product.is_digital ? (
            <div className="mt-3 flex gap-2">
              <div className="w-1/3">
                <label className={labelClass}>{t('product.qty', { defaultValue: 'Qty' })}</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className={inputClass}
                />
              </div>
              <div className="flex w-2/3 flex-col gap-2 pt-5">
                {purchaseFromCart && (
                  <button
                    type="button"
                    onClick={() => void axiosAdding(false)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-2.5 text-xs font-bold text-white shadow-soft transition hover:shadow-hover"
                  >
                    {t('product.add', { defaultValue: 'Add' })}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void axiosAdding(true)}
                  className="flex items-center justify-center rounded-xl border-2 border-primary px-4 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/5"
                >
                  {t('product.buy_now', { defaultValue: 'Buy now' })}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <div className="w-2/3">
                <label className={labelClass}>E-mail</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Eg. test@test.com"
                  className={inputClass}
                />
              </div>
              <div className="flex w-1/3 items-end">
                <button
                  type="button"
                  onClick={() => void axiosAdding(true)}
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-2.5 text-xs font-bold text-white shadow-soft transition hover:shadow-hover"
                >
                  {t('product.buy_now', { defaultValue: 'Buy now' })}
                </button>
              </div>
            </div>
          )}

          <div className="my-3 h-px bg-black/5" />

          <div className="mt-3 flex items-center justify-between">
            <div>
              <span className="text-[11px]">
                {t('product.ratings_comments', { defaultValue: 'Ratings & comments' })}
              </span>
              <p className="mb-0 mt-1">
                <strong className="text-primary">4.9</strong>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={14} className="inline fill-yellow-400 text-yellow-400" />
                ))}
              </p>
            </div>
            <div className="text-right">
              <button type="button" onClick={preComment} className="block text-primary">
                <MessageSquare size={12} className="mr-1 inline" />
                {product.comments && product.comments.length !== 0
                  ? `${product.comments.length} ${t('comments', { defaultValue: 'comments' })}`
                  : t('no_comments', { defaultValue: 'No comments' })}
              </button>
              <span className="text-[10px] opacity-60">
                {t('product.verified_customers', { defaultValue: 'Verified customers' })}
              </span>
            </div>
          </div>

          {isOwner && approbationActive && product.status && (
            <p className="mt-3 text-right text-xs font-semibold text-primary">
              {t(`product_${product.status}`, { defaultValue: product.status })}
            </p>
          )}
        </div>

        {!product.is_digital && (product.shipping_zone?.length ?? 0) > 0 && (
          <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-soft">
            <h2 className="mb-3 text-sm font-bold text-ink">
              {t('shipping_zones_and_fees', { defaultValue: 'Shipping zones & fees' })}
            </h2>
            {(product.shipping_zone ?? []).map((zone, index) => (
              <div key={index} className="border-b border-black/5 py-2 last:border-0">
                <strong className="block text-[10px] font-semibold text-ink">
                  {zone.country_name}, {zone.city ?? t('everywhere_in_country', { defaultValue: 'Everywhere in country' })}
                </strong>
                <p className="text-xs text-ink">
                  {zone.city ? `${zone.zone ?? zone.city ?? zone.country_name}\n` : ''}
                  {t('shipping_cost', {
                    defaultValue: 'Shipping cost : {amount}',
                    amount: formatAmount(zone.fee_amount, product.currency),
                  })}
                </p>
              </div>
            ))}
          </div>
        )}

        {!product.is_digital && product.free_shipping && (
          <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-soft">
            <h2 className="mb-3 text-sm font-bold text-ink">
              {t('free_shipping_zones', { defaultValue: 'Free shipping zones' })}
            </h2>
            {(product.free_shipping_zone ?? []).map((zone, index) => (
              <div key={index} className="border-b border-black/5 py-2 last:border-0">
                <strong className="block text-[10px] font-semibold text-ink">
                  {zone.country_name}, {zone.city ?? t('everywhere_in_country', { defaultValue: 'Everywhere in country' })}
                </strong>
                <p className="text-xs text-ink">
                  {zone.city
                    ? (zone.zone ?? zone.city ?? zone.country_name)
                    : t('everywhere_in_country', { defaultValue: 'Everywhere in country' })}
                </p>
              </div>
            ))}
          </div>
        )}

        {image && product.images.length > 1 && (
          <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-soft">
            <p className="text-xs font-semibold text-primary">
              {t('product.view_in_detail', { defaultValue: 'View in detail' })} {product.images.length}
            </p>
            <h2 className="text-sm font-bold text-ink">
              {t('product.product_gallery', { defaultValue: 'Product gallery' })}
            </h2>
            <div className="mt-3 space-y-3">
              {product.images.map((img, index) => (
                <img key={index} src={img.lien} alt="" className="w-full rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {product.comments && product.comments.length > 0 && (
          <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-soft">
            <p className="text-xs font-semibold text-primary">
              {t('product.what_pioneers_say', { defaultValue: 'What pioneers say' })}
            </p>
            <h2 className="text-sm font-bold text-ink">
              {t('product.product_comments', { defaultValue: 'Product comments' })}
            </h2>
            <div className="mt-3 space-y-4">
              {product.comments.map((comment, index) =>
                comment && comment.user ? (
                  <div key={index} className="leading-[14px]">
                    <h6 className="inline text-sm font-semibold text-ink">@{comment.user.username}</h6>
                    &nbsp;
                    <span className="text-[10px] opacity-40">
                      {formatDate(comment.created_at)}
                    </span>
                    <p className="mt-3 text-xs text-ink">{comment.comment}</p>
                  </div>
                ) : null,
              )}
            </div>
          </div>
        )}
      </section>

      {isDeleting && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <Loader2 size={32} className="animate-spin text-white" />
        </div>
      )}

      {commentOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setCommentOpen(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-primary">
                  {t('comment.comment_text', { defaultValue: 'Leave a comment on this product' })}
                </p>
                <h3 className="text-lg font-bold text-ink">
                  {t('comment.comment', { defaultValue: 'Comment' })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCommentOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-4">
              <label className={labelClass}>
                {t('comment.your_comment', { defaultValue: 'Your comment' })}
              </label>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              disabled={isCommenting}
              onClick={() => void submitComment()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-sm font-bold text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
            >
              {isCommenting && <Loader2 size={15} className="animate-spin" />}
              {t('send', { defaultValue: 'Send' })}
            </button>
          </div>
        </div>
      )}

      {walletOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setWalletOpen(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">
                {t('pay_with', { defaultValue: 'Pay with' })}
              </h3>
              <button
                type="button"
                onClick={() => setWalletOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => void askPinAndBoost()}
                className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3.5 text-left text-sm font-bold text-white shadow-soft transition hover:opacity-90"
              >
                <Wallet size={18} />
                {t('piketplace_wallet', { defaultValue: 'Piketplace Wallet' })}
              </button>
              <button
                type="button"
                onClick={() => void payWithPiNetwork()}
                className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-[#fbb148] to-[#f5a72b] px-4 py-3.5 text-left text-sm font-bold text-white shadow-soft transition hover:opacity-90"
              >
                <img src="/site_images/pi.png" alt="π" className="h-5 w-5 rounded-full object-cover" />
                {t('pinetwork_wallet', { defaultValue: 'Pi Network wallet' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {stockOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setStockOpen(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-primary-dark">
                {t('add_stock', { defaultValue: 'Add stock' })}
              </h3>
              <button
                type="button"
                onClick={() => setStockOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-4">
              <label className={labelClass}>
                {t('instock', { quantity: 0, defaultValue: 'Quantity in stock' })}
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void sendStockRequest()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-sm font-bold text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <>
                  <PackagePlus size={17} strokeWidth={2.2} />
                  {t('add', { defaultValue: 'Add' })}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {reasonsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setReasonsOpen(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-3xl bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-ink">{t('reasons', { defaultValue: 'Reasons' })}</h4>
              <button
                type="button"
                onClick={() => setReasonsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {reasons.map((reason) => (
                <label
                  key={reason.code}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-3 text-xs text-ink"
                >
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(reason.code)}
                    onChange={(e) =>
                      setSelectedReasons((prev) =>
                        e.target.checked ? [...prev, reason.code] : prev.filter((c) => c !== reason.code),
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-[#ec11b5]"
                  />
                  {reason.text}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={updateReasons}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-xs font-bold text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
            >
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              {t('continue', { defaultValue: 'Continue' })}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GlobeIcon() {
  return (
    <svg
      className="mr-1 inline"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

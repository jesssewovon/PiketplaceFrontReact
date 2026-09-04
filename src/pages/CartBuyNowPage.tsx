import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Loader2, MapPin, Minus, Pencil, Plus, Wallet, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  BuyNowCartItem,
  DeliveryCompany,
  PiketplaceWalletPaymentPayload,
  Product,
  ProductShippingZone,
  ShippingAddress,
} from '../types'
import {
  confirmCart,
  fetchCartBuyNowData,
  fetchCitiesByCountry,
  isEmail,
  payPiketplaceWallet,
  postPiPayment,
  searchDeliveryCompanies,
  verifyPayment,
} from '../lib/api'
import { createPiPayment, initPi, waitForPi } from '../lib/pi'
import { formatAmount } from '../lib/format'
import { flagEmoji } from '../lib/geo'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'

const labelClass = 'mb-1.5 block text-xs font-semibold text-ink-soft'

const emptyAddress: ShippingAddress = {
  name: '',
  country_name: '',
  country_code: '',
  city: '',
  address: '',
  phone_number: '',
  email: '',
  is_default: false,
}

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

const zoneCountry = (zone: ProductShippingZone): string =>
  typeof zone.country_code === 'string' ? zone.country_code : ''

export default function CartBuyNowPage() {
  const { id, inFreeShippingZone } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)
  const settings = useAppSelector((state) => state.settings.settings)
  const storedCountries = useAppSelector((state) => state.attributes.countries)

  const walletUrl =
    typeof settings?.piket_wallet_frontend_url === 'string'
      ? (settings.piket_wallet_frontend_url as string)
      : null
  const xendloLink =
    typeof settings?.xendlo_access_link === 'string'
      ? (settings.xendlo_access_link as string)
      : '#'
  const priceUsdAccepted =
    typeof settings?.price_usd_accepted === 'boolean' ? (settings.price_usd_accepted as boolean) : null

  const productId = Number(id)
  const routeFreeZone = inFreeShippingZone ?? ''

  const [product, setProduct] = useState<Product | null>(null)
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [handlingFeePercentage, setHandlingFeePercentage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [qty, setQty] = useState(1)
  const [email, setEmail] = useState('')
  const [noShipping, setNoShipping] = useState(false)

  const [address, setAddress] = useState<ShippingAddress>(emptyAddress)
  const [addressSet, setAddressSet] = useState(false)
  const isNewAddressRef = useRef<string | undefined>(undefined)

  const [canPay, setCanPay] = useState(false)
  const [preOrder, setPreOrder] = useState(false)
  const [freeZoneAnswer, setFreeZoneAnswer] = useState('')
  const [paidZoneAnswer, setPaidZoneAnswer] = useState('')
  const [inAFreezoneCity, setInAFreezoneCity] = useState(false)
  const [inAPaidzoneCity, setInAPaidzoneCity] = useState(false)
  const [directFreeShipping, setDirectFreeShipping] = useState(false)
  const [directPaidShipping, setDirectPaidShipping] = useState(false)
  const [finalFreeShipping, setFinalFreeShipping] = useState(false)
  const [finalPaidShipping, setFinalPaidShipping] = useState(false)
  const freeZoneLabelRef = useRef('')
  const [paidZonesList, setPaidZonesList] = useState('')
  const [paidShippingSelected, setPaidShippingSelected] = useState<ProductShippingZone | null>(null)

  const [selectAddressOpen, setSelectAddressOpen] = useState(false)
  const [newAddressOpen, setNewAddressOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [form, setForm] = useState<ShippingAddress>(emptyForm)
  const [cities, setCities] = useState<string[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)

  const [searchingOnXendlo, setSearchingOnXendlo] = useState(false)
  const [deliverCompanies, setDeliverCompanies] = useState<DeliveryCompany[] | null>(null)
  const [confirmInXendloZone, setConfirmInXendloZone] = useState(false)

  const [confirming, setConfirming] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  const verifierRef = useRef<number | null>(null)
  const uniqueIdRef = useRef('')

  const countries = useMemo(() => {
    if (Array.isArray(storedCountries)) return storedCountries as Record<string, unknown>[]
    return []
  }, [storedCountries])

  const compareCartAddresses = useCallback(
    (addr: ShippingAddress, prod: Product, currentNoShipping: boolean) => {
      let directFree = false
      let directPaid = false
      let inFreeCity = false
      let inPaidCity = false
      let preOrd = false
      let canPayTmp = false
      let freeLabel = ''
      let paidSelected: ProductShippingZone | null = null
      let paidList = ''

      if (prod.free_shipping && Array.isArray(prod.free_shipping_zone)) {
        for (const zone of prod.free_shipping_zone) {
          if (zoneCountry(zone) === addr.country_code) {
            if (
              zone.city == null ||
              (zone.city === addr.city && zone.zone === '') ||
              (zone.city === addr.city && zone.zone === addr.address)
            ) {
              directFree = true
              canPayTmp = true
              break
            } else if (zone.city === addr.city && zone.zone !== addr.address) {
              inFreeCity = true
              freeLabel = prod.free_shipping_zone
                .map((item) => item.zone)
                .filter(Boolean)
                .join(', ')
              break
            }
          }
        }
      }

      if ((prod.shipping_zone?.length ?? 0) > 0 && Array.isArray(prod.shipping_zone)) {
        for (const zone of prod.shipping_zone) {
          if (zoneCountry(zone) === addr.country_code) {
            if (
              zone.city == null ||
              (zone.city === addr.city && zone.zone === '') ||
              (zone.city === addr.city && zone.zone === addr.address)
            ) {
              directPaid = true
              paidSelected = zone
              canPayTmp = true
              break
            } else if (zone.city === addr.city && zone.zone !== addr.address) {
              inPaidCity = true
              const list = prod.shipping_zone.filter((x) => zoneCountry(x) === addr.country_code)
              paidList = list
                .map((item) => item.zone)
                .filter(Boolean)
                .join(', ')
              break
            }
          }
        }
      }

      setFreeZoneAnswer('')
      setPaidZoneAnswer('')
      setInAFreezoneCity(inFreeCity)
      setInAPaidzoneCity(inPaidCity)
      setDirectFreeShipping(directFree)
      setDirectPaidShipping(directPaid)
      setPreOrder(false)
      setNoShipping(false)
      setCanPay(canPayTmp)
      freeZoneLabelRef.current = freeLabel
      setPaidZonesList(paidList)
      setPaidShippingSelected(paidSelected)
      setFinalFreeShipping(directFree)
      setFinalPaidShipping(directPaid)

      if (prod.free_shipping === false && (prod.shipping_zone?.length ?? 0) === 0) preOrd = true
      if (!directFree && !directPaid && !inFreeCity && !inPaidCity) preOrd = true
      if (!currentNoShipping && !directFree && !directPaid) preOrd = true
      setPreOrder(preOrd)
    },
    [],
  )

  const loadProductData = useCallback(async () => {
    if (!productId || Number.isNaN(productId)) {
      setNotFound(true)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const data = await fetchCartBuyNowData(token ?? undefined, productId)
      if (data.product) {
        const prod = data.product
        const list = data.addresses ?? []
        setProduct(prod)
        setAddresses(list)
        setHandlingFeePercentage(Number(data.handling_fee_percentage ?? 0))
        if (prod.is_digital === true) {
          if (user?.email) setEmail(user.email)
          setAddress((prev) => ({ ...prev, email: user?.email ?? prev.email }))
        } else if (isLoggedIn && Array.isArray(list)) {
          let selected = emptyAddress
          for (const item of list) {
            if (item.is_default === true) {
              selected = item
              break
            }
          }
          setAddress(selected)
          setAddressSet(true)
          if (selected.email && email === '') setEmail(selected.email)
          compareCartAddresses(selected, prod, false)
        }
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setIsLoading(false)
    }
  }, [productId, token, user?.email, isLoggedIn, email, compareCartAddresses])

  useEffect(() => {
    void loadProductData()
  }, [loadProductData])

  useEffect(() => {
    if (user?.email) setEmail(user.email)
  }, [user?.email])

  useEffect(() => () => {
    if (verifierRef.current !== null) {
      window.clearInterval(verifierRef.current)
      verifierRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!form.country_code) {
      setCities([])
      return
    }
    let cancelled = false
    setCitiesLoading(true)
    fetchCitiesByCountry(form.country_code)
      .then((list) => {
        if (!cancelled) setCities(list)
      })
      .catch(() => {
        if (!cancelled) setCities([])
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [form.country_code])

  const selectAddress = (addr: ShippingAddress) => {
    setAddress(addr)
    isNewAddressRef.current = 'false'
    setAddressSet(true)
    setSelectAddressOpen(false)
    if (product) compareCartAddresses(addr, product, noShipping)
  }

  const saveLocalAddress = () => {
    if (
      !form.name ||
      !form.country_name ||
      !form.city ||
      !form.address ||
      !form.phone_code ||
      !form.phone_number
    ) {
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('fill_all_fields', { defaultValue: 'Please fill all fields' }),
        confirmButtonColor: '#ec11b5',
      })
      return
    }
    const saved = { ...form }
    setAddress(saved)
    isNewAddressRef.current = 'true'
    setAddressSet(true)
    setNewAddressOpen(false)
    if (product) compareCartAddresses(saved, product, noShipping)
  }

  const processPreOrder = useCallback(
    (opts: { freeAns?: string; paidAns?: string; paidSel?: ProductShippingZone | null } = {}) => {
      const freeAns = opts.freeAns !== undefined ? opts.freeAns : freeZoneAnswer
      const paidAns = opts.paidAns !== undefined ? opts.paidAns : paidZoneAnswer
      const paidSel = opts.paidSel !== undefined ? opts.paidSel : paidShippingSelected

      let preOrd = false
      let canPayTmp = false

      if (
        addressSet &&
        ((inAFreezoneCity && freeAns === 'no' && !inAPaidzoneCity) ||
          (inAPaidzoneCity && paidAns !== 'yes') ||
          (!inAFreezoneCity && !inAPaidzoneCity))
      ) {
        preOrd = true
      }

      let finalFree = finalFreeShipping
      let finalPaid = finalPaidShipping

      if (freeAns === 'yes') {
        finalFree = true
        preOrd = false
        canPayTmp = true
      }

      if (paidAns === 'yes' && paidSel) {
        finalPaid = true
        preOrd = false
        canPayTmp = true
      }

      setFinalFreeShipping(finalFree)
      setFinalPaidShipping(finalPaid)
      setPreOrder(preOrd)
      setCanPay(canPayTmp)
      if (freeAns === 'yes') {
        setPaidZoneAnswer('')
      }
      setPaidShippingSelected(paidSel)
    },
    [
      addressSet,
      inAFreezoneCity,
      inAPaidzoneCity,
      freeZoneAnswer,
      paidZoneAnswer,
      paidShippingSelected,
      finalFreeShipping,
      finalPaidShipping,
    ],
  )

  const handleFreeZoneAnswer = (value: string) => {
    setFreeZoneAnswer(value)
    processPreOrder({ freeAns: value })
  }

  const handlePaidZoneAnswer = (value: string) => {
    setPaidZoneAnswer(value)
    processPreOrder({ paidAns: value })
  }

  const handleZoneSelect = (zone: ProductShippingZone) => {
    processPreOrder({ paidAns: 'yes', paidSel: zone })
  }

  useEffect(() => {
    setCanPay(false)
    if (noShipping === true) {
      setCanPay(true)
      setPreOrder(false)
    }
  }, [noShipping])

  useEffect(() => {
    setCanPay(false)
    setPreOrder(false)
    if (confirmInXendloZone === true) {
      setCanPay(true)
      setPreOrder(false)
    }
  }, [confirmInXendloZone])

  useEffect(() => {
    if (routeFreeZone === 'yes') {
      setFreeZoneAnswer('yes')
    }
  }, [routeFreeZone])

  const totals = useMemo(() => {
    const result = { total: 0, totalAndHandlingFee: 0, handlingFeePiket: 0 }
    if (!product) return result
    if (preOrder && !noShipping && !confirmInXendloZone) return result
    if (paidZoneAnswer === 'yes' && !paidShippingSelected) return result
    let itemTotal = product.price * qty
    let fee = 0
    if (finalPaidShipping && !noShipping && paidShippingSelected?.fee_amount != null) {
      fee = Number(paidShippingSelected.fee_amount)
    }
    if (noShipping) itemTotal = product.price * qty
    if (product.is_digital) itemTotal = product.price
    const total = parseFloat(String(itemTotal)) + parseFloat(String(fee))
    const handlingFeePi = (total * handlingFeePercentage) / 100
    return {
      total,
      totalAndHandlingFee: total + handlingFeePi,
      handlingFeePiket: handlingFeePi * 1000,
    }
  }, [
    product,
    qty,
    preOrder,
    noShipping,
    confirmInXendloZone,
    paidZoneAnswer,
    paidShippingSelected,
    finalPaidShipping,
    handlingFeePercentage,
  ])

  const showError = (text: string) => {
    void Swal.fire({
      icon: 'error',
      title: t('info', { defaultValue: 'Info' }),
      text,
      confirmButtonColor: '#ec11b5',
    })
  }

  const buildCart = (): BuyNowCartItem[] => {
    const data: BuyNowCartItem[] = [
      {
        id: product?.id ?? 0,
        quantity: qty,
        noshipping: noShipping,
        final_free_shipping: finalFreeShipping,
        final_paid_shipping: finalPaidShipping,
        paid_shipping_info: paidShippingSelected
          ? { selected: paidShippingSelected, fee: Number(paidShippingSelected.fee_amount ?? 0) }
          : {},
        pre_order: preOrder,
      },
    ]
    return data
  }

  const openWalletModal = () => {
    if (!product) return
    const purchaseActivation = settings?.purchase_activation !== false
    if (!purchaseActivation) {
      showError(t('purchase_deactivated', { defaultValue: 'Purchasing is temporarily deactivated' }))
      return
    }
    if (product.is_digital && !isEmail(email)) {
      showError(t('email_required_with_format', { defaultValue: 'E-mail required with email format' }))
      return
    }
    setWalletOpen(true)
  }

  const askPinAndPayPiketplaceWallet = async () => {
    setWalletOpen(false)
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
    if (!result.isConfirmed || !result.value) return
    await payWithPiketplaceWallet(String(result.value))
  }

  const payWithPiketplaceWallet = async (codePin: string) => {
    if (!product) return
    if (!product.is_digital && !noShipping && !addressSet) {
      setSelectAddressOpen(true)
      return
    }
    if (product.is_digital === true) {
      setAddress((prev) => ({ ...prev, email }))
    }
    const payloadAddress = product.is_digital ? { ...address, email } : address
    const payload: PiketplaceWalletPaymentPayload = {
      code_pin: codePin,
      isNewAddress: isNewAddressRef.current ?? 'false',
      total: totals.total,
      address: payloadAddress,
      product: {
        id: product.id,
        quantity: qty,
        noshipping: noShipping,
        direct_free_shipping: directFreeShipping,
        direct_paid_shipping: directPaidShipping,
      },
      cart: buildCart(),
      isBuyNow: true,
      handling_fee_percentage: handlingFeePercentage,
    }
    setIsPaying(true)
    try {
      console.log('Paying with Piketplace Wallet, payload:', payload)
      const res = await payPiketplaceWallet(token ?? undefined, user?.uid, payload)
      setIsPaying(false)
      if (res.status === true) {
        void Swal.fire({
          icon: 'success',
          title: t('cart.success', { defaultValue: 'Success' }),
          text: t('cart.payment_done', { defaultValue: 'Payment done successfully' }),
          confirmButtonColor: '#ec11b5',
        }).then(() => navigate('/my-orders'))
      } else if (res.message === 'message.invalid_address') {
        showError(t('invalid_address', { defaultValue: 'Invalid address' }))
      } else if (res.message) {
        showError(t(res.message, { defaultValue: res.message }))
      } else {
        showError(t('an_error_occured', { defaultValue: 'An error occured' }))
      }
    } catch {
      setIsPaying(false)
      showError(t('an_error_occured', { defaultValue: 'An error occured' }))
    }
  }

  const startPaymentVerifier = () => {
    if (verifierRef.current !== null) window.clearInterval(verifierRef.current)
    verifierRef.current = window.setInterval(async () => {
      if (uniqueIdRef.current === '') return
      try {
        const res = await verifyPayment(token ?? undefined, uniqueIdRef.current, user?.id)
        if (res.payment != null && verifierRef.current !== null) {
          window.clearInterval(verifierRef.current)
          verifierRef.current = null
          uniqueIdRef.current = ''
          void Swal.fire({
            icon: 'success',
            title: t('info', { defaultValue: 'Info' }),
            text: t('cart.payment_done', { defaultValue: 'Payment done successfully' }),
            confirmButtonColor: '#ec11b5',
          }).then(() => navigate('/my-orders'))
        }
      } catch {
        // keep polling
      }
    }, 3000)
  }

  const payWithPiNetworkWallet = async () => {
    if (!product) return
    if (!product.is_digital && !noShipping && !addressSet) {
      setWalletOpen(false)
      setSelectAddressOpen(true)
      return
    }
    setWalletOpen(false)
    setConfirming(true)
    const cart = buildCart()
    try {
      const res = await confirmCart(token ?? undefined, {
        user_id: user?.id,
        cart,
        address,
        price_usd_accepted: priceUsdAccepted,
        save_cart: false,
      })
      setConfirming(false)
      if (res.status === true && res.data_cart) {
        await launchPiPayment(res.data_cart)
      } else if (res.message === 'message.invalid_address') {
        showError(t('invalid_address', { defaultValue: 'Invalid address' }))
      } else if (res.message === 'price_usd_accepted_status_changed') {
        showError(t('price_usd_accepted_status_changed', { defaultValue: res.message }))
      } else if (res.message === 'message.cart.quantity_insufficient') {
        const p = res.data?.product
        const quantitySelling = Number(p?.quantity_selling ?? 0)
        showError(
          t('cart.quantity_insufficient', {
            defaultValue: 'Insufficient quantity for product {libelle}, remaining quantity {quantity_left}',
            libelle: p?.libelle ?? '',
            quantity_left: (p?.quantity ?? 0) - quantitySelling,
          }),
        )
      } else if (res.message) {
        showError(t(res.message, { defaultValue: res.message }))
      }
    } catch {
      setConfirming(false)
      showError(t('an_error_occured', { defaultValue: 'An error occured' }))
    }
  }

  const launchPiPayment = async (dataCart: NonNullable<
    Awaited<ReturnType<typeof confirmCart>>['data_cart']
  >) => {
    if (!product) return
    const uniqueId = crypto.randomUUID()
    uniqueIdRef.current = uniqueId
    const metadata: Record<string, unknown> = {
      uniqueId,
      type: 5,
      userId: user?.id,
      isNewAddress: isNewAddressRef.current ?? 'false',
      cart: dataCart.cart,
      isBuyNow: true,
      price_usd_accepted: dataCart.price_usd_accepted,
      pi_usdt_value: dataCart.pi_usdt_value,
      handling_fee_percentage: dataCart.handling_fee_percentage,
      handling_fee: (Number(dataCart.total ?? 0) * handlingFeePercentage) / 100,
      is_piket: 'false',
    }
    if (!noShipping) metadata.address = address
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
      await window.Pi.authenticate(['username', 'payments'], onIncompletePaymentFound).catch(
        () => undefined,
      )
      createPiPayment(
        {
          amount: Number(dataCart.total ?? totals.total),
          memo: t('product_purchase', { defaultValue: 'Product purchase from Piketplace' }),
          metadata,
        },
        {
          onReadyForServerApproval: (paymentId) =>
            void postPiPayment(token ?? undefined, user?.uid, 'approve', { paymentId }),
          onReadyForServerCompletion: (paymentId, txid) =>
            void postPiPayment(token ?? undefined, user?.uid, 'complete', { paymentId, txid }),
          onCancel: () => undefined,
          onError: () => undefined,
        },
      )
      startPaymentVerifier()
    } catch {
      showError(t('please_use_pi_browser', { defaultValue: 'Please use the Pi browser' }))
    }
  }

  const searchForDeliveryCompanies = async () => {
    if (!product) return
    setSearchingOnXendlo(true)
    setDeliverCompanies(null)
    try {
      const res = await searchDeliveryCompanies({
        departure_country_code: product.country_code,
        departure_city: product.city,
        departure_address: product.address,
        arrival_country_code: address.country_code,
        arrival_city: address.city,
        arrival_address: address.address,
      })
      setDeliverCompanies(res.deliverCompanies ?? [])
    } catch {
      setDeliverCompanies([])
    } finally {
      setSearchingOnXendlo(false)
    }
  }

  const countryNameByCode = (code?: string): string => {
    if (!code) return ''
    const entry = countries.find((c) => String(c.iso2 ?? '').toUpperCase() === code.toUpperCase())
    const translations = entry?.translations as Record<string, string> | undefined
    const locale = i18n.language.split('-')[0]
    return translations?.[locale] ?? (entry?.name as string | undefined) ?? code
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

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-xs text-ink-soft">
        <p className="text-sm font-medium text-ink">
          {t('product_not_found', { defaultValue: 'Product not found' })}
        </p>
      </div>
    )
  }

  const image = product.imageFirst ?? product.images?.[0]?.lien
  const qtyInsufficient = !product.is_digital && product.quantity < qty
  const showXendloBlock = !(product.is_digital === true)
  const filteredPickupZones = (dc: DeliveryCompany) =>
    (dc.pickup_zones ?? []).filter((line) => line.city === product.city)
  const filteredDropZones = (dc: DeliveryCompany) =>
    (dc.drop_zones ?? []).filter((line) => line.city === address.city)

  return (
    <div className="animate-fade-in">
      <section className="px-4 pb-6 pt-3">
        {product && (
          <>
            {qtyInsufficient && (
              <em className="mb-1 block text-[11px] text-primary">
                {t('cart.qty_insufficient', {
                  defaultValue: 'Insufficient quantity, available: {quantity}',
                  quantity: product.quantity,
                })}
              </em>
            )}

            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-soft">
              <div className="flex gap-3">
                <button type="button" onClick={() => navigate(`/product/${product.id}`)}>
                  {image && (
                    <img
                      src={image}
                      alt={product.libelle}
                      className="h-[110px] w-[110px] rounded-xl border border-slate-200 object-cover"
                    />
                  )}
                </button>
                <div className="min-w-0 flex-1 pt-1">
                  <h6 className="pb-2 text-sm font-medium leading-snug text-ink">{product.libelle}</h6>
                  <span className="text-sm font-bold text-primary">
                    {formatAmount(product.price, product.currency)}
                  </span>
                  {!product.is_digital &&
                    paidShippingSelected != null &&
                    !noShipping &&
                    directPaidShipping && (
                      <h5 className="pt-1 text-xs font-medium text-ink">
                        <span className="font-bold text-black">
                          {t('shipping_cost', {
                            defaultValue: 'Shipping cost : {amount}',
                            amount: formatAmount(paidShippingSelected.fee_amount, product.currency),
                          })}
                        </span>
                      </h5>
                    )}
                </div>
              </div>

              {!product.is_digital && (
                <div className="mt-2 rounded-xl border border-black/5 bg-white p-3 shadow-soft">
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-ink transition hover:bg-slate-50"
                        aria-label="-"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                        className="w-14 rounded-lg border border-slate-200 bg-mist/40 px-2 py-1.5 text-center text-sm text-ink outline-none focus:border-primary focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.min(99, q + 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-ink transition hover:bg-slate-50"
                        aria-label="+"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {!directFreeShipping && (
                      <label className="flex items-center gap-2 text-xs font-medium text-ink">
                        <input
                          type="checkbox"
                          checked={noShipping}
                          onChange={(e) => setNoShipping(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-[#ec11b5]"
                        />
                        {t('address.no_shipping', { defaultValue: 'No shipping' })}
                      </label>
                    )}
                    {directFreeShipping && (
                      <span className="text-xs font-medium text-ink">
                        {t('free_shipping', { defaultValue: 'Free shipping' })}
                      </span>
                    )}
                  </div>

                  {noShipping && (
                    <p className="mb-1 mt-2 rounded-xl bg-[khaki] p-2.5 text-xs text-black">
                      ℹ️ {t('no_shipping_getting_product_from_seller', {
                        defaultValue: 'No shipping : means you will pick up the product from the seller',
                      })}
                    </p>
                  )}

                  <div className="my-2 h-px bg-black/5" />

                  {!directFreeShipping && inAFreezoneCity && !noShipping && (
                    <div>
                      <h4 className="text-xs font-semibold text-ink">
                        {t('are_you_in_free_shipping_zone', {
                          defaultValue: 'Are you in free shipping zone ? {zone}',
                          zone: freeZoneLabelRef.current,
                        })}
                      </h4>
                      <div className="mt-1 flex gap-8">
                        <label className="flex items-center gap-2 text-xs text-ink">
                          <input
                            type="radio"
                            name="in_free_shipping_zone"
                            value="yes"
                            checked={freeZoneAnswer === 'yes'}
                            onChange={() => handleFreeZoneAnswer('yes')}
                            className="h-4 w-4 accent-[#ec11b5]"
                          />
                          {t('yes', { defaultValue: 'Yes' })}
                        </label>
                        <label className="flex items-center gap-2 text-xs text-ink">
                          <input
                            type="radio"
                            name="in_free_shipping_zone"
                            value="no"
                            checked={freeZoneAnswer === 'no'}
                            onChange={() => handleFreeZoneAnswer('no')}
                            className="h-4 w-4 accent-[#ec11b5]"
                          />
                          {t('no', { defaultValue: 'No' })}
                        </label>
                      </div>
                      {freeZoneAnswer === 'yes' && (
                        <p className="mt-2 rounded-xl bg-[khaki] p-2.5 text-xs leading-relaxed text-black">
                          ℹ️ {t('address.seller_will_ship_free', {
                            defaultValue: 'Seller will ship you the product for free',
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {!directPaidShipping && !directFreeShipping && !noShipping && (
                    <>
                      {(paidZoneAnswer === 'no' && inAPaidzoneCity) ||
                      (inAPaidzoneCity && !inAFreezoneCity) ? (
                        <div className="mt-2">
                          <h4 className="text-xs font-semibold text-ink">
                            {t('are_you_in_paid_shipping_zone', {
                              defaultValue: 'Are you in paid shipping zone ? {zone}',
                              zone: paidZonesList,
                            })}
                          </h4>
                          <div className="mt-1 flex gap-8">
                            <label className="flex items-center gap-2 text-xs text-ink">
                              <input
                                type="radio"
                                name="in_paid_shipping_zone"
                                value="yes"
                                checked={paidZoneAnswer === 'yes'}
                                onChange={() => handlePaidZoneAnswer('yes')}
                                className="h-4 w-4 accent-[#ec11b5]"
                              />
                              {t('yes', { defaultValue: 'Yes' })}
                            </label>
                            <label className="flex items-center gap-2 text-xs text-ink">
                              <input
                                type="radio"
                                name="in_paid_shipping_zone"
                                value="no"
                                checked={paidZoneAnswer === 'no'}
                                onChange={() => handlePaidZoneAnswer('no')}
                                className="h-4 w-4 accent-[#ec11b5]"
                              />
                              {t('no', { defaultValue: 'No' })}
                            </label>
                          </div>
                          {paidZoneAnswer === 'yes' && (
                            <div className="mt-2 rounded-xl bg-[#f0f0f0] p-2.5 text-left">
                              <h3 className="text-[13px] font-semibold text-primary">
                                {t('choose_shipping_zone', {
                                  defaultValue:
                                    'Click below to choose your matched shipping zone',
                                })}
                              </h3>
                              <ul className="mb-1 mt-1 list-disc ps-5">
                                {(product.shipping_zone ?? [])
                                  .filter((z) => zoneCountry(z) === address.country_code)
                                  .map((zone, i) => (
                                    <li
                                      key={i}
                                      onClick={() => handleZoneSelect(zone)}
                                      className="mb-1 cursor-pointer rounded-md bg-slate-200 p-1.5 text-xs leading-[18px] text-black"
                                    >
                                      {formatAmount(zone.fee_amount, product.currency)}
                                      {paidShippingSelected &&
                                        zone.zone === paidShippingSelected.zone && (
                                          <span className="ml-1 text-green-600">✔</span>
                                        )}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </>
                  )}

                  {preOrder && !noShipping && (
                    <p className="mb-1 mt-2 rounded-xl bg-[khaki] p-2.5 text-xs leading-5 text-black">
                      ℹ️ {t('preorder_registration_message', {
                        defaultValue:
                          "This product shipping zones defined by seller don't match your shipping address, it is going to be registered like pre-command to looking for companies or deliver for shipping.",
                      })}
                    </p>
                  )}

                  <strong className="mt-2 block text-xs leading-[18px] text-ink">
                    <MapPin size={15} className="mr-1 inline text-primary" />
                    <em>{t('product_address', { defaultValue: 'Product address' })}</em> :{' '}
                    {countryNameByCode(product.country_code)}/{product.city}
                  </strong>
                </div>
              )}
            </div>

            {showXendloBlock && (
              <div className="mt-3 rounded-2xl border border-black/5 bg-white p-4 shadow-soft">
                <div className="text-center">
                  <button
                    type="button"
                    disabled={searchingOnXendlo}
                    onClick={() => void searchForDeliveryCompanies()}
                    className="mx-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-5 py-2.5 text-xs font-bold text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
                  >
                    Search shipping on Xendlo
                    {searchingOnXendlo && <Loader2 size={15} className="animate-spin" />}
                  </button>
                </div>

                {deliverCompanies && (
                  <div className="mt-3 block w-full">
                    {deliverCompanies.length === 0 ? (
                      <p className="text-center text-xs text-ink-soft">
                        {t('no delivery man/company found', {
                          defaultValue: 'No delivery man/company found',
                        })}
                      </p>
                    ) : (
                      <>
                        <p className="text-center text-xs text-ink-soft">
                          {t('x delivery person(s)/company(s) found', {
                            defaultValue: '{x} delivery person(s)/company(s) found',
                            x: deliverCompanies.length,
                          })}
                        </p>
                        {deliverCompanies.map((dc, index) => (
                          <div
                            key={index}
                            className="mt-2 rounded-xl bg-[#f5f5f5] p-2.5 text-xs text-ink"
                          >
                            <div className="text-center font-semibold text-primary">
                              🚚 {dc.name}
                            </div>
                            <div className="mt-1 text-center text-primary">
                              {t('pick up zones', { defaultValue: 'Pick up zones' })}
                            </div>
                            <ul className="m-0 list-disc p-0 ps-5">
                              {filteredPickupZones(dc).map((line, i) => (
                                <li key={i}>{line.zone}</li>
                              ))}
                            </ul>
                            <hr className="my-1" />
                            <div className="text-center text-primary">
                              {t('drop off zones', { defaultValue: 'Drop off zones' })}
                            </div>
                            <ul className="m-0 list-disc p-0 ps-5">
                              {filteredDropZones(dc).map((line, i) => (
                                <li key={i}>{line.zone}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        {deliverCompanies.length > 0 && (
                          <label className="mt-3 flex items-center gap-2 text-xs font-medium text-ink">
                            <input
                              type="checkbox"
                              checked={confirmInXendloZone}
                              onChange={(e) => setConfirmInXendloZone(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 accent-[#ec11b5]"
                            />
                            I confirm i am in one of the above delivery zones listed
                          </label>
                        )}
                      </>
                    )}
                  </div>
                )}
                <hr className="my-2" />
                <div className="text-right text-[11px]">
                  <a href={xendloLink} target="_blank" rel="noreferrer" className="text-primary underline">
                    Xendlo delivery App
                  </a>
                </div>
              </div>
            )}

            <div className="mt-3 rounded-2xl border border-black/5 bg-white p-4 shadow-soft">
              {product.is_digital && (
                <div className="mb-3">
                  <label className={labelClass}>E-mail</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Eg. test@test.com"
                    className={inputClass}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-primary">
                  {t('handling_fee', { defaultValue: 'Handling fee' })}
                </span>
                <span className="text-[13px] font-black text-ink">{handlingFeePercentage}%</span>
              </div>
              <hr className="my-2" />
              <div className="flex items-start justify-between">
                <p className="text-[13px] font-semibold text-primary">
                  {t('cart.total', { defaultValue: 'Total' })} ≈
                </p>
                <div className="text-right">
                  <span className="block text-right text-sm font-black text-ink">
                    {formatAmount(totals.totalAndHandlingFee, product.currency)}
                  </span>
                  <div className="m-1 flex items-center gap-2">
                    <div className="h-px flex-1 bg-black/10" />
                    <span className="text-[11px] text-ink-soft">
                      {t('or', { defaultValue: 'or' })}
                    </span>
                    <div className="h-px flex-1 bg-black/10" />
                  </div>
                  <span className="inline-block text-right text-sm font-black text-ink">
                    {formatAmount(totals.total, product.currency)}+
                    {formatAmount(totals.handlingFeePiket, 'Piket')}
                  </span>
                </div>
              </div>

              {!product.is_digital && !noShipping && (
                <div className="mt-3 rounded-xl bg-[#fafafa] p-3">
                  <div className="flex w-full items-center justify-between text-sm font-semibold text-ink">
                    {t('address.shipping', { defaultValue: 'Shipping' })}
                    <button
                      type="button"
                      onClick={() => setSelectAddressOpen(true)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary-deep text-white"
                      aria-label={t('edit_cart', { defaultValue: 'Edit cart' })}
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                  <div className="mb-2 mt-1 h-px bg-black/5" />
                  <h6 className="flex justify-between text-sm font-extrabold text-ink">
                    {t('address.name', { defaultValue: 'Name' })}
                    <span className="font-semibold text-primary">{address.name}</span>
                  </h6>
                  <h6 className="flex justify-between text-sm font-extrabold text-ink">
                    {t('address.country', { defaultValue: 'Country' })}
                    <span className="font-semibold text-primary">
                      {address.country_code ? flagEmoji(address.country_code) : ''}{' '}
                      {address.country_name}
                    </span>
                  </h6>
                  <h6 className="flex justify-between text-sm font-extrabold text-ink">
                    {t('address.city', { defaultValue: 'City' })}
                    <span className="font-semibold text-primary">{address.city}</span>
                  </h6>
                  <h6 className="flex justify-between text-sm font-extrabold text-ink">
                    {t('address.street_address_shorten', { defaultValue: 'Addr.' })}
                    <span className="font-semibold text-primary">{address.address}</span>
                  </h6>
                  <h6 className="flex justify-between text-sm font-extrabold text-ink">
                    {t('address.phone_number_shorten', { defaultValue: 'Phone' })}
                    <span className="font-semibold text-primary">
                      {address.phone_code} {address.phone_number}
                    </span>
                  </h6>
                </div>
              )}
            </div>

            {qtyInsufficient ? (
              <p className="mt-3 text-center text-xs text-primary">
                {t('cart.qty_insufficient', {
                  defaultValue: 'Insufficient quantity, available: {quantity}',
                  quantity: product.quantity,
                })}
              </p>
            ) : (
              <>
                {(canPay || product.is_digital === true) && (
                  <button
                    type="button"
                    disabled={confirming || isPaying}
                    onClick={openWalletModal}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-sm font-bold text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
                  >
                    {(confirming || isPaying) && <Loader2 size={15} className="animate-spin" />}
                    {t('cart.proceed_to_checkout', { defaultValue: 'Proceed to checkout' })}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </section>

      {selectAddressOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setSelectAddressOpen(false)}
        >
          <div
            className="max-h-[70vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-primary">
                  {t('address.shipping_address', { defaultValue: 'Shipping address' })}
                </h3>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(emptyForm)
                      setSelectAddressOpen(false)
                      setNewAddressOpen(true)
                    }}
                    className="flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary-deep px-3 py-1 text-[10px] font-bold uppercase text-white"
                  >
                    <Plus size={11} /> {t('new', { defaultValue: 'New' })}
                  </button>
                  <Link
                    to="/my-addresses"
                    className="flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary-deep px-3 py-1 text-[10px] font-bold uppercase text-white"
                  >
                    <MapPin size={11} />
                  </Link>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectAddressOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {addresses && addresses.length > 0 ? (
              <div className="space-y-2">
                {addresses.map((addr, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectAddress(addr)}
                    className="block w-full rounded-xl border border-slate-100 px-3 py-2.5 text-left text-xs text-ink transition hover:bg-slate-50"
                  >
                    {addr.address}/{addr.city}-{addr.country_name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-ink-soft">
                {t('empty', { defaultValue: 'Empty' })}
              </p>
            )}
          </div>
        </div>
      )}

      {newAddressOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setNewAddressOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8"
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
                onClick={() => setNewAddressOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelClass}>
                  {t('address.name', { defaultValue: 'Name' })}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t('select_country', { defaultValue: 'Select country' })}
                </label>
                <select
                  value={form.country_code ?? ''}
                  onChange={(e) => {
                    const code = e.target.value
                    const entry = countries.find((c) => c.iso2 === code)
                    const translations = entry?.translations as Record<string, string> | undefined
                    const locale = i18n.language.split('-')[0]
                    setForm((prev) => ({
                      ...prev,
                      country_code: code,
                      country_name: translations?.[locale] ?? (entry?.name as string | undefined) ?? '',
                      city: '',
                    }))
                  }}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {t('select_country', { defaultValue: 'Select country' })}
                  </option>
                  {countries.map((country, i) => (
                    <option key={i} value={String(country.iso2 ?? '')}>
                      {String(country.name ?? '')}
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
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      {t('select_city', { defaultValue: 'Select city' })}
                    </option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                ) : cities.length === 0 ? (
                  <p className="text-center text-[10px] text-ink-soft">
                    {t('no_more_data', { defaultValue: 'No more data' })}
                  </p>
                ) : null}
              </div>

              <div>
                <label className={labelClass}>
                  {t('address.street_address', { defaultValue: 'Street address' })}
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
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
                    placeholder="+001"
                    value={form.phone_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone_code: e.target.value }))}
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
                    onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 pt-1 text-xs font-medium text-ink">
                <input
                  type="checkbox"
                  checked={form.is_default === true}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 accent-[#ec11b5]"
                />
                {t('set_as_default', { defaultValue: 'Set as default' })}
              </label>

              <button
                type="button"
                onClick={saveLocalAddress}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-xs font-bold text-white shadow-soft transition hover:shadow-hover"
              >
                {t('add', { defaultValue: 'Add' })}
              </button>
            </div>
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
                onClick={() => void askPinAndPayPiketplaceWallet()}
                className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3.5 text-left text-sm font-bold text-white shadow-soft transition hover:opacity-90"
              >
                <Wallet size={18} />
                {t('piketplace_wallet', { defaultValue: 'Piketplace Wallet' })}
              </button>
              <button
                type="button"
                onClick={() => void payWithPiNetworkWallet()}
                className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-[#fbb148] to-[#f5a72b] px-4 py-3.5 text-left text-sm font-bold text-white shadow-soft transition hover:opacity-90"
              >
                <img src="/site_images/pi.png" alt="π" className="h-5 w-5 rounded-full object-cover" />
                {t('pinetwork_wallet', { defaultValue: 'Pi Network wallet' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {(confirming || isPaying) && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <Loader2 size={32} className="animate-spin text-white" />
        </div>
      )}
    </div>
  )
}

export {}

declare global {
  interface PiUser {
    uid: string
    username: string
    roles?: string[]
    email?: string
    avatar?: string
    is_partner?: boolean
    id?: number
    hasShop?: boolean
    shortname?: string
    fullnameOrUsername?: string
    shortShopname?: string
    shop?: {
      id?: number
      shopname?: string
      [key: string]: unknown
    } | null
  }

  interface PiAuthResult {
    user: PiUser
    accessToken: string
    [key: string]: unknown
  }

  interface PiPaymentData {
    amount: number
    memo: string
    metadata?: Record<string, unknown>
    [key: string]: unknown
  }

  interface PiPaymentCallbacks {
    onReadyForServerApproval?: (paymentId: string) => Promise<unknown> | void
    onReadyForServerCompletion?: (paymentId: string, txid: string) => Promise<unknown> | void
    onCancel?: (paymentId: string) => void
    onError?: (error: unknown, payment?: unknown) => void
  }

  interface PiAdResponse {
    result?: string
    adId?: string
    adid?: string
    [key: string]: unknown
  }

  interface PiAds {
    isAdReady(type: 'interstitial' | 'rewarded'): Promise<{ ready: boolean }>
    requestAd(type: 'interstitial' | 'rewarded'): Promise<PiAdResponse>
    showAd(type: 'interstitial' | 'rewarded'): Promise<PiAdResponse>
  }

  interface Window {
    Pi?: {
      init(options: { version: string; sandbox: boolean }): void
      authenticate(
        scopes: string[],
        onIncompletePaymentFound?: (payment: unknown) => void,
      ): Promise<PiAuthResult>
      createPayment(paymentData: PiPaymentData, callbacks: PiPaymentCallbacks): void
      openShareDialog(title: string, message: string): void
      Ads?: PiAds
    }
  }
}

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

  interface Window {
    Pi?: {
      init(options: { version: string; sandbox: boolean }): void
      authenticate(
        scopes: string[],
        onIncompletePaymentFound?: (payment: unknown) => void,
      ): Promise<PiAuthResult>
    }
  }
}

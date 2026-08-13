const SCOPES = ['username', 'payments']

export function isPiReady(): boolean {
  return typeof window !== 'undefined' && Boolean(window.Pi)
}

export function initPi(): void {
  if (!isPiReady()) return
  window.Pi?.init({ version: '2.0', sandbox: false })
}

export function waitForPi(timeoutMs = 8000): Promise<void> {
  if (isPiReady()) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const check = () => {
      if (isPiReady()) {
        resolve()
      } else if (Date.now() - started > timeoutMs) {
        reject(new Error('Pi SDK failed to load'))
      } else {
        setTimeout(check, 100)
      }
    }
    check()
  })
}

export async function authenticateWithPi(): Promise<PiAuthResult> {
  await waitForPi()
  initPi()
  if (!window.Pi) throw new Error('Pi SDK is not available')
  return window.Pi.authenticate([...SCOPES])
}

export async function createPiPayment(
  paymentData: PiPaymentData,
  callbacks: PiPaymentCallbacks,
): Promise<void> {
  await waitForPi()
  initPi()
  if (!window.Pi) throw new Error('Pi SDK is not available')
  window.Pi.createPayment(paymentData, callbacks)
}

export async function showRewardedAd(): Promise<PiAdResponse> {
  await waitForPi()
  initPi()
  if (!window.Pi?.Ads) throw new Error('Pi Ads is not available')
  const ready = await window.Pi.Ads.isAdReady('rewarded')
  if (ready.ready !== true) {
    const requestAdResponse = await window.Pi.Ads.requestAd('rewarded')
    if (requestAdResponse.result === 'ADS_NOT_SUPPORTED') {
      return { result: 'ADS_NOT_SUPPORTED' }
    }
  }
  return window.Pi.Ads.showAd('rewarded')
}

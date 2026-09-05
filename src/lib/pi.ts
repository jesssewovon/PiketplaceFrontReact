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

export async function showRewardedAd(timeoutMs = 10000): Promise<PiAdResponse> {
  const run = async () => {
    await waitForPi()
    initPi()
    if (!window.Pi?.Ads) throw new Error('Pi Ads is not available')
    const ready = await window.Pi.Ads.isAdReady('rewarded')
    // showAlert('Pi Ads', `Ad ready: ${ready.ready}`, 'info')
    if (ready.ready !== true) {
      const requestAdResponse = await window.Pi.Ads.requestAd('rewarded')
      const result = requestAdResponse.result
      if (
        result === 'ADS_NOT_SUPPORTED' ||
        result === 'AD_FAILED_TO_LOAD' ||
        result === 'AD_NOT_AVAILABLE'
      ) {
        return requestAdResponse
      }
    }
    const res = await window.Pi.Ads.showAd('rewarded')
    // showAlert('Pi Ads', `Ad result: ${JSON.stringify(res)}`, 'info')
    return res
  }
  return Promise.race([
    run(),
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new Error('Pi Ads timed out')), timeoutMs)
    }),
  ])
}

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

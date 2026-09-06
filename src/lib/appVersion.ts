import { useEffect, useRef } from 'react'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'

const VERSION_URL = '/version.json'
const CHECK_INTERVAL_MS = 60000

interface VersionPayload {
  version?: string
}

export async function clearAppCaches(): Promise<void> {
  try {
    localStorage.clear()
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.clear()
  } catch {
    /* ignore */
  }
  if ('caches' in window) {
    try {
      const keys = await window.caches.keys()
      await Promise.all(keys.map((key) => window.caches.delete(key)))
    } catch {
      /* ignore */
    }
  }
}

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch(VERSION_URL, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as VersionPayload
    return typeof data.version === 'string' && data.version.length > 0 ? data.version : null
  } catch {
    return null
  }
}

export function useAppVersionCheck() {
  const { t } = useTranslation()
  const baselineRef = useRef<string | null>(null)
  const promptedRef = useRef<string | null>(null)
  const checkingRef = useRef(false)

  useEffect(() => {
    if (import.meta.env.DEV) return

    let interval: ReturnType<typeof setInterval> | undefined
    let disposed = false

    const check = async () => {
      if (disposed || checkingRef.current) return
      checkingRef.current = true
      try {
        const version = await fetchVersion()
        if (version === null) return
        if (baselineRef.current === null) {
          baselineRef.current = version
          return
        }
        if (version === baselineRef.current) return
        if (version === promptedRef.current) return
        promptedRef.current = version

        const { isConfirmed } = await Swal.fire({
          icon: 'info',
          title: t('new_version_available', {
            defaultValue: 'A new version is available',
          }),
          text: t('new_version_available_click_ok', {
            defaultValue: 'A new version is now available. Click OK to reload the page.',
          }),
          confirmButtonText: t('ok', { defaultValue: 'OK' }),
          showCloseButton: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
        })

        if (isConfirmed) {
          baselineRef.current = version
          await clearAppCaches()
          window.location.reload()
        }
      } finally {
        checkingRef.current = false
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void check()
    }

    interval = setInterval(check, CHECK_INTERVAL_MS)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', onVisibilityChange)
    void check()

    return () => {
      disposed = true
      if (interval) clearInterval(interval)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [t])
}
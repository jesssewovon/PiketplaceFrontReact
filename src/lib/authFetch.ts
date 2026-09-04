import { logout } from '../store/authSlice'
import { syncUserFromPayload } from '../store/userSync'
import type { AppDispatch } from '../store/index'

let dispatch: AppDispatch | null = null
let navigate: ((path: string) => void) | null = null
let handling401 = false

export function initAuthFetch(
  storeDispatch: AppDispatch,
  navigateFn: (path: string) => void,
) {
  dispatch = storeDispatch
  navigate = navigateFn
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init)

  if (response.status === 401 && dispatch && navigate && !handling401) {
    handling401 = true
    dispatch(logout())
    navigate('/account')
    setTimeout(() => {
      handling401 = false
    }, 1000)
  }

  try {
    const clone = response.clone()
    const payload = (await clone.json().catch(() => null)) as unknown
    syncUserFromPayload(payload)
  } catch {
    // ignore responses that are not JSON or cannot be cloned
  }

  return response
}

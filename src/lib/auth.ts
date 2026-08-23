import { authenticateWithPi } from './pi'
import { signIn } from './api'
import { loginSuccess } from '../store/authSlice'
import type { AppDispatch } from '../store'

export async function loginWithPi(dispatch: AppDispatch): Promise<void> {
  const authResult = await authenticateWithPi()
  const response = await signIn(authResult)

  const token =
    response.token ??
    response.access_token ??
    ((response.data as Record<string, unknown> | null | undefined)?.token as string | undefined)

  if (!token) {
    throw new Error(response.message ?? 'Backend authentication failed')
  }

  const user =
    response.user ??
    ((response.data as Record<string, unknown> | null | undefined)?.user as PiUser | undefined) ??
    authResult.user ??
    null

  const permissions =
    response.permissions ??
    (response.data as Record<string, unknown> | null | undefined)?.permissions ??
    null

  dispatch(loginSuccess({ user, token, permissions }))
}

import { authenticateWithPi } from './pi'
import { signIn } from './api'
import { loginSuccess } from '../store/authSlice'
import type { AppDispatch } from '../store'
import { syncSettingsFromPayload } from '../store/settingsSync'

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
  console.log('loginWithPi: response:', response)
  const user =
    response.current_user_for_automatic_update as any ??
    ((response.data as Record<string, unknown> | null | undefined)?.user as PiUser | undefined) ??
    authResult.user ??
    null
  
  syncSettingsFromPayload(response)
  
  const permissions = user.permissions ?? []

  dispatch(loginSuccess({ user, token, permissions }))
}

import { store } from './index'
import { updateUser } from './authSlice'

export function syncUserFromPayload(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return
  const record = payload as Record<string, unknown>
  const data = record
  if (!data || typeof data !== 'object') return
  const user =
    (data as Record<string, unknown>).current_user_for_automatic_update ??
    (data as Record<string, unknown>).user
  if (user && typeof user === 'object') {
    store.dispatch(updateUser(user as Partial<PiUser>))
  }
}
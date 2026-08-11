import { store } from './index'
import { setSettings, type AppSettings } from './settingsSlice'

export function syncSettingsFromPayload(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return
  const record = payload as Record<string, unknown>
  const settings = record.settings_user
  if (settings && typeof settings === 'object') {
    store.dispatch(setSettings(settings as AppSettings))
  }
}

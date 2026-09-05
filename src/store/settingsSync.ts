import { store } from './index'
import { setSettings, type AppSettings } from './settingsSlice'

export function syncSettingsFromPayload(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return
  const record = payload as Record<string, unknown>
  const settings = record.settings_user
  if (settings && typeof settings === 'object') {
    const merged = { ...(settings as AppSettings) } as AppSettings
    if (record.data_link && typeof record.data_link === 'object') {
      merged.data_link = record.data_link
    } else {
      const current = store.getState().settings.settings
      if (current && current.data_link) {
        merged.data_link = current.data_link
      }
    }
    store.dispatch(setSettings(merged))
  }
}

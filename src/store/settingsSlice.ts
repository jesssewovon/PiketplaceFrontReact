import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type AppSettings = Record<string, unknown>

export interface SettingsState {
  settings: AppSettings | null
}

const STORAGE_KEY = 'piketplace_settings'

function loadInitialState(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppSettings
      if (parsed && typeof parsed === 'object') {
        return { settings: parsed }
      }
    }
  } catch {
    // ignore corrupted storage
  }
  return { settings: null }
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadInitialState(),
  reducers: {
    setSettings(state, action: PayloadAction<AppSettings | null>) {
      state.settings = action.payload
      if (action.payload) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    },
  },
})

export const { setSettings } = settingsSlice.actions
export default settingsSlice.reducer

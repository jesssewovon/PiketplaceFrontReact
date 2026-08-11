import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export const ATTRIBUTE_KEYS = [
  'languages',
  'agreements',
  'reasons',
  'purchase_activation',
  'mining_activation',
  'delivery_penalties_limit',
  'countries',
] as const

export type AppAttributeKey = (typeof ATTRIBUTE_KEYS)[number]

export type AttributesState = Partial<Record<AppAttributeKey, unknown>>

const STORAGE_KEY = 'piketplace_attributes'

function loadInitialState(): AttributesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AttributesState
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    }
  } catch {
    // ignore corrupted storage
  }
  return {}
}

const attributesSlice = createSlice({
  name: 'attributes',
  initialState: loadInitialState(),
  reducers: {
    mergeAttributes(state, action: PayloadAction<Partial<AttributesState>>) {
      Object.assign(state, action.payload)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    },
  },
})

export const { mergeAttributes } = attributesSlice.actions
export default attributesSlice.reducer

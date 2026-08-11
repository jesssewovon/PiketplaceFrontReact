import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import settingsReducer from './settingsSlice'
import attributesReducer from './attributesSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    settings: settingsReducer,
    attributes: attributesReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AuthState {
  isLoggedIn: boolean
  user: PiUser | null
  token: string | null
  permissions: unknown
}

interface LoginPayload {
  user: PiUser | null
  token: string
  permissions: unknown
}

const STORAGE_KEY = 'piketplace_auth'

function loadInitialState(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AuthState
      if (parsed && parsed.isLoggedIn && typeof parsed.token === 'string') {
        return {
          isLoggedIn: true,
          user: parsed.user ?? null,
          token: parsed.token,
          permissions: parsed.permissions ?? null,
        }
      }
    }
  } catch {
    // ignore corrupted storage
  }
  return { isLoggedIn: false, user: null, token: null, permissions: null }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitialState(),
  reducers: {
    loginSuccess(state, action: PayloadAction<LoginPayload>) {
      state.isLoggedIn = true
      state.user = action.payload.user
      state.token = action.payload.token
      state.permissions = action.payload.permissions
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    },
    logout(state) {
      state.isLoggedIn = false
      state.user = null
      state.token = null
      state.permissions = null
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})

export const { loginSuccess, logout } = authSlice.actions
export default authSlice.reducer

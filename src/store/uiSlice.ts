import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface UiState {
  productsLoaded: boolean
}

const initialState: UiState = {
  productsLoaded: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setProductsLoaded(state, action: PayloadAction<boolean>) {
      state.productsLoaded = action.payload
    },
  },
})

export const { setProductsLoaded } = uiSlice.actions
export default uiSlice.reducer

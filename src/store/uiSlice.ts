import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { FilterState } from '../lib/filterState'
import { defaultFilter } from '../lib/filterState'

export interface UiState {
  productsLoaded: boolean
  filterOpen: boolean
  appliedFilter: FilterState
}

const initialState: UiState = {
  productsLoaded: false,
  filterOpen: false,
  appliedFilter: defaultFilter,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setProductsLoaded(state, action: PayloadAction<boolean>) {
      state.productsLoaded = action.payload
    },
    setFilterOpen(state, action: PayloadAction<boolean>) {
      state.filterOpen = action.payload
    },
    setAppliedFilter(state, action: PayloadAction<FilterState>) {
      state.appliedFilter = action.payload
    },
  },
})

export const { setProductsLoaded, setFilterOpen, setAppliedFilter } = uiSlice.actions
export default uiSlice.reducer

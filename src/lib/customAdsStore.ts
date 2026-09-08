import type { CustomAd, CustomAdPeriod } from '../types'

export interface CustomAdsCache {
  ads: CustomAd[]
  fetchedAt: number | null
}

export const customAdsCache: CustomAdsCache = {
  ads: [],
  fetchedAt: null,
}

export function cacheCustomAds(ads: CustomAd[]) {
  customAdsCache.ads = ads
  customAdsCache.fetchedAt = Date.now()
}

export interface PeriodsStore {
  periods: CustomAdPeriod[]
  loaded: boolean
}

export const periodsStore: PeriodsStore = {
  periods: [],
  loaded: false,
}
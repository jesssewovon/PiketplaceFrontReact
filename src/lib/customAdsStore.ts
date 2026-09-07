import type { CustomAd } from '../types'

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
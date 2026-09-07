import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CustomAd } from '../types'
import LazyImage from './LazyImage'

interface CustomAdsSliderProps {
  ads: CustomAd[]
  onOpenUrl?: (url: string) => void
}

export default function CustomAdsSlider({ ads, onOpenUrl }: CustomAdsSliderProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const trackRef = useRef<HTMLDivElement | null>(null)

  const list = Array.isArray(ads) ? ads : []

  useEffect(() => {
    const interval = window.setInterval(() => {
      const track = trackRef.current
      if (!track) return
      const maxScroll = track.scrollWidth - track.clientWidth
      if (maxScroll <= 0) return
      const item = track.firstElementChild as HTMLElement | null
      const step = item ? item.offsetWidth + 12 : Math.min(300, track.clientWidth)
      if (track.scrollLeft >= maxScroll - 10) {
        track.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        track.scrollBy({ left: step, behavior: 'smooth' })
      }
    }, 4000)
    return () => window.clearInterval(interval)
  }, [])

  const scroll = (dir: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const item = track.firstElementChild as HTMLElement | null
    const step = item ? item.offsetWidth + 12 : Math.min(300, track.clientWidth)
    track.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const handleOpen = (ad: CustomAd) => {
    const url = ad.url
    if (!url) return
    if (typeof onOpenUrl === 'function') {
      onOpenUrl(url)
      return
    }
    if (url.startsWith('/')) {
      navigate(url)
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const createButton = (key: string) => (
    <button
      key={key}
      type="button"
      onClick={() => navigate('/submit-ad')}
      className="flex h-32 w-56 shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-primary-deep px-2 text-center text-white shadow-soft transition hover:opacity-90"
    >
      {t('custom_ads.create_my_ad', { defaultValue: 'Show my ad here' })}
    </button>
  )

  const items: ReactNode[] = []
  if (list.length === 0) {
    return (
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => navigate('/submit-ad')}
          className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-deep px-8 py-2 text-sm font-bold text-white shadow-soft transition hover:opacity-90"
        >
          {t('custom_ads.create_my_ad', { defaultValue: 'Show my ad here' })}
        </button>
      </div>
    )
  } else {
    list.forEach((ad, index) => {
      items.push(
        <button
          key={ad.id}
          type="button"
          onClick={() => handleOpen(ad)}
          className={`group relative h-32 w-56 shrink-0 snap-start overflow-hidden rounded-2xl border border-black/5 shadow-soft ${
            ad.url ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          <LazyImage src={ad.image} alt={ad.name} className="h-full w-full" />
          {ad.name && (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-1.5 pt-5 text-left text-xs font-semibold text-white">
              {ad.name}
            </span>
          )}
        </button>,
      )
      if (list.length === 1 || (index + 1) % 2 === 0) {
        items.push(createButton(`create-${ad.id}`))
      }
    })
  }

  return (
    <div className="relative">
      {list.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={t('custom_ads.prev', { defaultValue: 'Previous ads' })}
            className="absolute left-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-soft backdrop-blur transition hover:bg-white"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={t('custom_ads.next', { defaultValue: 'Next ads' })}
            className="absolute right-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-soft backdrop-blur transition hover:bg-white"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      <div ref={trackRef} className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-0.5 pb-1">
        {items}
      </div>
    </div>
  )
}
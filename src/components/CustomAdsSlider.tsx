import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
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
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
    if (ad.image) {
      setPreviewImage(ad.image)
      setPreviewUrl(ad.url ?? null)
      setZoomLevel(1)
    }
  }

  const handleVisit = () => {
    if (!previewUrl) return
    setPreviewImage(null)
    setPreviewUrl(null)
    setZoomLevel(1)
    if (typeof onOpenUrl === 'function') {
      onOpenUrl(previewUrl)
      return
    }
    if (previewUrl.startsWith('/')) {
      navigate(previewUrl)
    } else if (previewUrl.startsWith('http://') || previewUrl.startsWith('https://')) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer')
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
          className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-deep px-4 py-1.5 text-[10px] font-bold text-white shadow-soft transition hover:opacity-90"
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

      {previewImage &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex flex-col bg-black/95"
            onClick={() => {
              setPreviewImage(null)
              setPreviewUrl(null)
              setZoomLevel(1)
            }}
          >
            <div
              className="flex items-center justify-center gap-3 p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label={t('zoom_out', { defaultValue: 'Zoom out' })}
              >
                <ZoomOut size={20} />
              </button>
              <span className="min-w-[3.5rem] text-center text-sm font-bold text-white">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(4, Number((z + 0.25).toFixed(2))))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label={t('zoom_in', { defaultValue: 'Zoom in' })}
              >
                <ZoomIn size={20} />
              </button>
              {previewUrl && (
                <button
                  type="button"
                  onClick={handleVisit}
                  className="ml-2 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-dark"
                >
                  {t('visit', { defaultValue: 'Visit' })}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setPreviewImage(null)
                  setPreviewUrl(null)
                  setZoomLevel(1)
                }}
                className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label={t('close', { defaultValue: 'Close' })}
              >
                <X size={22} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2">
              <div className="flex h-full items-center justify-center overflow-auto">
                <img
                  src={previewImage}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                  style={{ width: `${zoomLevel * 100}%` }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoomLevel((z) => (z >= 4 ? 1 : Math.min(4, z + 0.5)))
                  }}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
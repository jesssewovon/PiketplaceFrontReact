import { useState } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  variant?: 'fill' | 'natural'
}

export default function LazyImage({
  src,
  alt,
  className,
  imgClassName,
  variant = 'fill',
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)

  if (variant === 'natural') {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`w-full transition-opacity duration-500 ${
          loaded ? 'h-auto opacity-100' : 'lazy-shimmer min-h-[180px]'
        } ${imgClassName ?? ''} ${className ?? ''}`}
      />
    )
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      {!loaded && <div className="lazy-shimmer absolute inset-0" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${imgClassName ?? ''}`}
      />
    </div>
  )
}

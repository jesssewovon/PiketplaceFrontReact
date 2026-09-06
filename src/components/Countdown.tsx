import { useEffect, useRef, useState } from 'react'

function pad(value: number): string {
  return value < 10 ? `0${value}` : `${value}`
}

interface CountdownProps {
  remainingMs: number
  onEnd?: () => void
}

export default function Countdown({ remainingMs, onEnd }: CountdownProps) {
  const [now, setNow] = useState(Date.now())
  const endRef = useRef<number | null>(null)
  const onEndRef = useRef(onEnd)
  const endedRef = useRef(false)

  useEffect(() => {
    onEndRef.current = onEnd
  }, [onEnd])

  useEffect(() => {
    endedRef.current = false
    if (remainingMs <= 0) {
      endRef.current = Date.now()
      setNow(Date.now())
      return
    }
    endRef.current = Date.now() + remainingMs
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [remainingMs])

  const diff = Math.max(0, (endRef.current ?? Date.now()) - now)

  useEffect(() => {
    if (diff <= 0 && !endedRef.current) {
      endedRef.current = true
      onEndRef.current?.()
    }
  }, [diff])

  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((diff % 1000) / 100)

  return (
    <span className="ml-1 font-bold text-primary">
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}.{tenths}
    </span>
  )
}
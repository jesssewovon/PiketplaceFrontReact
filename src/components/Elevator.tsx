import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

interface ElevatorProps {
  bottom?: number
}

const SHOW_AFTER = 250

export default function Elevator({ bottom = 16 }: ElevatorProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-soft transition-all duration-300 hover:bg-primary-dark ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
      style={{ bottom }}
    >
      <ArrowUp size={20} />
    </button>
  )
}
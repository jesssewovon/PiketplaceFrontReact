import { Rocket } from 'lucide-react'

interface BoostBadgeProps {
  className?: string
}

export default function BoostBadge({ className = '' }: BoostBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-l-md bg-red-600 px-1.5 py-1 text-white shadow-md ${className}`}
    >
      <Rocket size={14} fill="currentColor" strokeWidth={1} aria-hidden="true" />
    </span>
  )
}
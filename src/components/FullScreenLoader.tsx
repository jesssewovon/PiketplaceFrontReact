import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'

export default function FullScreenLoader() {
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <Loader2 size={32} className="animate-spin text-white" />
    </div>,
    document.body,
  )
}

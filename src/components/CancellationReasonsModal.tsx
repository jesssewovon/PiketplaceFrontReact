import { useState } from 'react'
import { X } from 'lucide-react'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'
import type { CancellationReason } from '../types'

interface CancellationReasonsModalProps {
  open: boolean
  reasons: CancellationReason[]
  onClose: () => void
  onSubmit: (selected: CancellationReason[]) => void
}

export default function CancellationReasonsModal({
  open,
  reasons,
  onClose,
  onSubmit,
}: CancellationReasonsModalProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<CancellationReason[]>([])

  if (!open) return null

  const toggle = (reason: CancellationReason) => {
    setSelected((prev) => {
      if (prev.some((item) => item.code === reason.code)) {
        return prev.filter((item) => item.code !== reason.code)
      }
      return [reason]
    })
  }

  const submit = () => {
    if (selected.length === 0) {
      void Swal.fire({
        icon: 'error',
        title: t('info', { defaultValue: 'Info' }),
        text: t('choose one reason', { defaultValue: 'Choose one reason' }),
        confirmButtonColor: '#ec11b5',
      })
      return
    }
    onSubmit(selected.map(({ code, text, penalty_point }) => ({ code, text, penalty_point })))
    setSelected([])
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={() => {
        setSelected([])
        onClose()
      }}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-primary-dark">{t('reasons', { defaultValue: 'Reasons' })}</h3>
          <button
            type="button"
            onClick={() => {
              setSelected([])
              onClose()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100"
            aria-label={t('close', { defaultValue: 'Close' })}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {reasons.map((reason) => {
            const checked = selected.some((item) => item.code === reason.code)
            return (
              <label
                key={reason.code}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-pink-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(reason)}
                  className="h-4 w-4 accent-[#ec11b5]"
                />
                <span className="text-sm font-medium text-ink">{reason.text}</span>
              </label>
            )
          })}
        </div>

        <button
          type="button"
          onClick={submit}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-sm font-bold text-white shadow-soft transition hover:shadow-hover"
        >
          {t('continue', { defaultValue: 'Continue' })}
        </button>
      </div>
    </div>
  )
}

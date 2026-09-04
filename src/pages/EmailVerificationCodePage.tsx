import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { setEmailValidation } from '../lib/api'
import type { ProfilResponse } from '../types'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

function messageText(res: ProfilResponse): string {
  const message = res.message
  if (typeof message === 'string') return message
  if (message && typeof message === 'object') {
    const record = message as Record<string, unknown>
    const email = record.email
    if (Array.isArray(email)) return email.join(' ')
    if (typeof email === 'string') return email
    if (typeof record.message === 'string') return record.message
  }
  return ''
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'

export default function EmailVerificationCodePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams<{ email: string }>()
  const email = params.email ? decodeURIComponent(params.email) : ''
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)

  const [code, setCode] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const showAlert = (icon: 'success' | 'error', text: string, onConfirm?: () => void) => {
    void Swal.fire({
      icon,
      title: t('info', { defaultValue: 'Info' }),
      text,
      confirmButtonColor: '#ec11b5',
    }).then((result) => {
      if (result.isConfirmed && onConfirm) onConfirm()
    })
  }

  const setEmailValidationCode = async () => {
    setIsSaving(true)
    try {
      const res = await setEmailValidation(token ?? undefined, email, code)
      setIsSaving(false)
      if (res.status === true) {
        showAlert('success', t('email_verified_successfully', { defaultValue: 'Email verified successfully' }), () =>
          navigate('/profil'),
        )
      } else {
        const m = messageText(res)
        if (m.includes('email_code_expired')) {
          showAlert('error', t('email_code_expired', { defaultValue: 'Verification code expired' }))
        } else if (m.includes('incorrect_email_code')) {
          showAlert('error', t('incorrect_email_code', { defaultValue: 'Incorrect verification code' }))
        } else if (m.includes('email_format_incorrect')) {
          showAlert('error', t('email_format_incorrect', { defaultValue: 'E-mail format incorrect' }))
        } else {
          showAlert('error', t('an_error_occured', { defaultValue: 'An error occurred' }))
        }
      }
    } catch {
      setIsSaving(false)
      showAlert('error', t('an_error_occured', { defaultValue: 'An error occurred' }))
    }
  }

  if (!isLoggedIn) {
    return <LoginPanel />
  }

  return (
    <div className="animate-fade-in">
      <section className="px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-sm text-ink transition hover:bg-slate-200"
          aria-label={t('go_back', { defaultValue: 'Go back' })}
        >
          <ArrowLeft size={15} />
        </button>
        <div className="min-h-[400px] rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
          <h5 className="text-center font-semibold text-primary">
            {t('email_verification_message', {
              defaultValue: 'You should receive a verification code in your mailbox',
            })}
          </h5>
          <div className="mt-6 space-y-3.5">
            <input
              type="text"
              inputMode="numeric"
              maxLength={50}
              placeholder={t('enter_verification_code', { defaultValue: 'Enter verification code' })}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="mt-8 flex w-full items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-primary px-5 py-2 text-xs font-bold text-primary transition hover:bg-primary/10"
            >
              {t('go_back', { defaultValue: 'Go back' })}
            </button>
            <button
              type="button"
              disabled={code === '' || isSaving}
              onClick={() => void setEmailValidationCode()}
              className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-deep px-5 py-2 text-xs font-bold text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
            >
              {isSaving && <Loader2 size={13} className="animate-spin" />}
              {t('verify', { defaultValue: 'Verify' })}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
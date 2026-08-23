import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { Check, ChevronDown, Loader2, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isEmail, sendEmailValidation, updateProfil } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { updateUser } from '../store/authSlice'
import LoginPanel from '../components/LoginPanel'
import countriesJson from '../locales/countries.json'

type CountryOption = [string, string]

function buildCountryOptions(raw: unknown): CountryOption[] {
  const list: CountryOption[] = []
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (entry && typeof entry === 'object') {
        const item = entry as Record<string, unknown>
        const code =
          typeof item.code === 'string' ? item.code : typeof item.iso2 === 'string' ? item.iso2 : null
        const name =
          typeof item.name === 'string'
            ? item.name
            : typeof item.translations === 'object' && item.translations !== null
              ? ((item.translations as Record<string, unknown>).en as string) ?? null
              : null
        if (code && name) list.push([code, name])
      }
    }
  }
  if (list.length > 0) return list
  return countriesJson
    .filter((c) => c.iso2 && c.name)
    .map((c) => [c.iso2, c.name] as CountryOption)
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-mist/40 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'

const labelClass = 'mb-1.5 block text-xs font-semibold text-ink-soft'

const emptyStr = (value: string | null | undefined): string =>
  value === '' || value === null || value === undefined ? '' : value

function emailErrorsInclude(res: { message?: unknown }, needle: string): boolean {
  const message = res.message
  if (!message || typeof message !== 'object') return false
  const email = (message as { email?: string | string[] }).email
  if (!email) return false
  const text = Array.isArray(email) ? email.join(' ') : email
  return text.includes(needle)
}

export default function ProfilPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)
  const storedCountries = useAppSelector((state) => state.attributes.countries)
  const countries = useMemo(() => buildCountryOptions(storedCountries), [storedCountries])
  const phoneCodeOptions = useMemo(() => {
    const seen = new Set<string>()
    const list: CountryOption[] = []
    for (const c of [...countriesJson].sort((a, b) => Number(a.phone_code) - Number(b.phone_code))) {
      if (!c.iso2 || !c.phone_code) continue
      const code = c.phone_code.startsWith('+') ? c.phone_code : `+${c.phone_code}`
      if (seen.has(code)) continue
      seen.add(code)
      list.push([code, `${code} (${c.iso2})`])
    }
    return list
  }, [])

  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [shopName, setShopName] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [notificationEmail, setNotificationEmail] = useState('')
  const [userCountry, setUserCountry] = useState<{ iso2?: string; name?: string } | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!user) return
    setFirstname(emptyStr(user.firstname))
    setLastname(emptyStr(user.lastname))
    setShopName(emptyStr(user.shop_name))
    setPhoneCode(emptyStr(user.phone_code))
    setPhoneNumber(emptyStr(user.phone_number))
    setEmail(emptyStr(user.email))
    setNotificationEmail(emptyStr(user.email))
    setUserCountry(user.user_country ?? null)
    setAvatarPreview(user.avatar && user.avatar !== 'site_images/pi.png' ? user.avatar : '/site_images/default_avatar.png')
  }, [user])

  const showAlert = (icon: 'success' | 'error', text: string) => {
    void Swal.fire({
      icon,
      title: t('info', { defaultValue: 'Info' }),
      text,
      confirmButtonColor: '#ec11b5',
    })
  }

  const onFileChangeAvatar = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const selectMyCountry = (code: string) => {
    const option = countries.find(([c]) => c === code)
    if (!option) return
    setUserCountry({ iso2: code, name: option[1] })
  }

  const sanitizePhone = (raw: string): string => {
    let value = raw.replace(/[^\d.]/g, '')
    const dots = value.match(/\./g)
    if (dots && dots.length > 1) {
      value = value.replace(/\.$/, '')
    }
    const parts = value.split('.')
    if (parts[1] && parts[1].length > 7) {
      return phoneNumber
    }
    return value
  }

  const update = async () => {
    if (phoneCode === '' || phoneNumber === '') {
      showAlert('error', t('set_phone_code_and_phone_number', { defaultValue: 'Set phone code and phone number' }))
      return
    }
    setIsSaving(true)
    try {
      const formData = new FormData()
      if (avatarFile) formData.append('avatar', avatarFile)
      formData.append('firstname', firstname)
      formData.append('lastname', lastname)
      formData.append('shop_name', shopName)
      formData.append('phone_code', phoneCode)
      formData.append('phone_number', phoneNumber)
      formData.append('email', email)
      formData.append('pi_users_id', String(user?.id ?? ''))
      formData.append('user_country', JSON.stringify(userCountry))
      const res = await updateProfil(token ?? undefined, formData)
      setIsSaving(false)
      if (res.status === true) {
        const resAvatar =
          typeof res.avatar === 'string'
            ? res.avatar
            : typeof (res.user as { avatar?: unknown } | undefined)?.avatar === 'string'
              ? ((res.user as { avatar: string }).avatar)
              : null
        const newAvatar = resAvatar ?? (avatarFile ? avatarPreview : null)
        dispatch(
          updateUser({
            firstname,
            lastname,
            shop_name: shopName,
            phone_code: phoneCode,
            phone_number: phoneNumber,
            email,
            user_country: userCountry as PiUser['user_country'],
            ...(newAvatar ? { avatar: newAvatar } : {}),
          }),
        )
        showAlert('success', t('saved', { defaultValue: 'Saved' }))
      } else if (emailErrorsInclude(res, 'email_exists')) {
        showAlert('error', t('email_exists', { defaultValue: 'E-mail exists' }))
      } else if (emailErrorsInclude(res, 'email_format_incorrect')) {
        showAlert('error', t('email_format_incorrect', { defaultValue: 'E-mail format incorrect' }))
      } else {
        showAlert('error', t('an_error_occured', { defaultValue: 'An error occurred' }))
      }
    } catch {
      setIsSaving(false)
      showAlert('error', t('an_error_occured', { defaultValue: 'An error occurred' }))
    }
  }

  const updateEmail = async () => {
    if ((user?.remainingTimeEmailVerification ?? 0) > 0) {
      showAlert(
        'error',
        t('remaining_time_for_new_email_validation', {
          defaultValue: 'it remains {time} hours for new email verification',
          time: user?.remainingTimeEmailVerification,
        }),
      )
      return
    }
    setIsSaving(true)
    try {
      const res = await sendEmailValidation(token ?? undefined, notificationEmail)
      setIsSaving(false)
      if (res.status === true) {
        navigate(`/email-verification-code/${encodeURIComponent(notificationEmail)}`)
      } else if (emailErrorsInclude(res, 'email_required')) {
        showAlert('error', t('email_required_with_format', { defaultValue: 'E-mail required with email format' }))
      } else if (emailErrorsInclude(res, 'email_exists')) {
        showAlert('error', t('email_exists', { defaultValue: 'E-mail exists' }))
      } else if (emailErrorsInclude(res, 'email_format_incorrect')) {
        showAlert('error', t('email_format_incorrect', { defaultValue: 'E-mail format incorrect' }))
      } else {
        showAlert('error', t('an_error_occured', { defaultValue: 'An error occurred' }))
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
        <div className="min-h-[500px] rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
          <div className="pb-4 pt-2">
            <img
              src={avatarPreview}
              alt=""
              className="inline h-20 w-20 rounded-full object-cover"
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg, image/gif, image/png"
              onChange={onFileChangeAvatar}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 transition hover:bg-emerald-500/20"
              aria-label={t('edit', { defaultValue: 'Edit' })}
            >
              <Pencil size={14} />
            </button>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className={labelClass}>{t('profilForm.firstname', { defaultValue: 'Firstname' })}</label>
              <input
                type="text"
                maxLength={40}
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t('profilForm.lastname', { defaultValue: 'Lastname' })}</label>
              <input
                type="text"
                maxLength={40}
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t('shopForm.shop_name', { defaultValue: 'Shop name' })}</label>
              <input
                type="text"
                maxLength={15}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <span className={labelClass}>{t('profilForm.my_country', { defaultValue: 'My country' })}</span>
              <div className="relative">
                <select
                  value={userCountry?.iso2 ?? ''}
                  onChange={(e) => selectMyCountry(e.target.value)}
                  className={`${inputClass} appearance-none pr-9`}
                >
                  <option value="" disabled>
                    {t('select_country', { defaultValue: 'Select country' })}
                  </option>
                  {countries.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              </div>
            </div>

            <div>
              <span className={labelClass}>{t('phone_number', { defaultValue: 'Phone number' })}</span>
              <div className="flex gap-2">
                <div className="relative w-[30%]">
                  <select
                    value=""
                    onChange={(e) => setPhoneCode(e.target.value)}
                    className={`${inputClass} appearance-none pr-9`}
                  >
                    <option value="">{phoneCode || 'Code'}</option>
                    {phoneCodeOptions.map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={15}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(sanitizePhone(e.target.value))}
                  className={`${inputClass} w-[70%]`}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => void update()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-xs font-black uppercase text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
            >
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              {t('profilForm.save', { defaultValue: 'Save' })}
            </button>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <label className={labelClass}>{t('profilForm.email', { defaultValue: 'E-mail' })}</label>
            <input
              type="email"
              maxLength={50}
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              className={inputClass}
            />
            <em className="mt-1 block text-[11px] not-italic text-slate-400">
              {t('profilForm.email_for_notifications', { defaultValue: 'E-mail collected for notifications' })}
            </em>
            <button
              type="button"
              disabled={notificationEmail === (user?.email ?? '') || !isEmail(notificationEmail)}
              onClick={() => void updateEmail()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-4 py-3 text-xs font-black uppercase text-white shadow-soft transition hover:shadow-hover disabled:opacity-60"
            >
              <Check size={14} />
              {t('verify_email', { defaultValue: 'Verify email' })}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

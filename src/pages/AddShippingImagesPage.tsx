import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { CloudUpload, Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LineOrder } from '../types'
import { fetchLineOrder, getSettingsUser, saveShippingImages, uploadFileToStore } from '../lib/api'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

type PreviewItem = { src: string; revoke: boolean }

export default function AddShippingImagesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { type = '' } = useParams()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)
  const user = useAppSelector((state) => state.auth.user)

  const lineOrderId =
    (location.state as { lineOrderId?: number } | null)?.lineOrderId ?? null

  const [isLoading, setIsLoading] = useState(false)
  const [nbFilesAccepted, setNbFilesAccepted] = useState(0)
  const [images, setImages] = useState<string[]>([])
  const [previews, setPreviews] = useState<PreviewItem[]>([])
  const [pendingUploads, setPendingUploads] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const imagesRef = useRef<string[]>([])
  const pickedFilesRef = useRef<{ name: string; size: number }[]>([])

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    return () => {
      for (const item of previews) {
        if (item.revoke) URL.revokeObjectURL(item.src)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isLoggedIn || lineOrderId == null) return
    let cancelled = false
    setIsLoading(true)
    Promise.all([
      getSettingsUser(token ?? undefined),
      fetchLineOrder(token ?? undefined, lineOrderId).catch(() => null),
    ])
      .then(([settingsRes, lineRes]) => {
        if (cancelled) return
        const nb = Number(settingsRes.settings_user?.nb_files_shipping ?? 0)
        setNbFilesAccepted(Number.isFinite(nb) ? nb : 0)
        const lineOrder = lineRes?.line_order as LineOrder | undefined
        const existing = (lineOrder?.shipping_images?.[type] ?? []).map((im) => im.lien)
        if (existing.length > 0) {
          setImages(existing)
          setPreviews(existing.map((lien) => ({ src: lien, revoke: false })))
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isLoggedIn, token, lineOrderId, type])

  const showAlert = useCallback(
    (icon: 'success' | 'error', text: string) => {
      void Swal.fire({
        icon,
        title: t('info', { defaultValue: 'Info' }),
        text,
        confirmButtonColor: '#ec11b5',
      })
    },
    [t],
  )

  const uploadOneFile = useCallback(
    async (file: File) => {
      setPendingUploads((prev) => prev + 1)
      try {
        const res = await uploadFileToStore(token ?? undefined, file)
        if (res.name) {
          setImages((prev) => [...prev, res.name as string])
          setPreviews((prev) => [
            ...prev,
            { src: URL.createObjectURL(file), revoke: true },
          ])
        }
      } catch {
        showAlert('error', t('an_error_occured', { defaultValue: 'An error occurred' }))
      } finally {
        setPendingUploads((prev) => Math.max(0, prev - 1))
      }
    },
    [showAlert, t, token],
  )

  const onChange = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      let incoming = Array.from(fileList)
      const current = imagesRef.current
      if (current.length >= nbFilesAccepted && nbFilesAccepted > 0) {
        showAlert('error', t('limit_reached', { defaultValue: 'Limit reached' }))
        return
      }
      const fileExist = incoming.some((file) =>
        pickedFilesRef.current.some(
          (picked) => picked.name === file.name && picked.size === file.size,
        ),
      )
      if (fileExist) {
        showAlert('error', t('image_exists', { defaultValue: 'Image exists' }))
        return
      }
      incoming = incoming.filter((file) => {
        const lower = file.type.toLowerCase()
        return (
          lower === 'image/jpg' ||
          lower === 'image/jpeg' ||
          lower === 'image/png' ||
          lower === 'image/webp'
        )
      })
      if (incoming.length === 0) {
        showAlert(
          'error',
          t('only_jpg_jpeg_png_webp_accepted', {
            defaultValue: 'Only jpg/jpeg/png/webp accepted',
          }),
        )
        return
      }
      const remaining = nbFilesAccepted - current.length
      if (remaining < incoming.length && nbFilesAccepted > 0) {
        incoming = incoming.slice(0, Math.max(0, remaining))
        showAlert('error', t('max_files_reached', { defaultValue: '{nb} max files reached', nb: nbFilesAccepted }))
      }
      for (const file of incoming) {
        pickedFilesRef.current.push({ name: file.name, size: file.size })
        void uploadOneFile(file)
      }
    },
    [nbFilesAccepted, showAlert, t, uploadOneFile],
  )

  const removeItem = (index: number) => {
    const preview = previews[index]
    if (preview?.revoke) URL.revokeObjectURL(preview.src)
    setPreviews((prev) => prev.filter((_, i) => i !== index))
    setImages((prev) => prev.filter((_, i) => i !== index))
    const existingCount = Math.max(0, imagesRef.current.length - pickedFilesRef.current.length)
    if (index >= existingCount) {
      pickedFilesRef.current.splice(index - existingCount, 1)
    }
  }

  const save = async () => {
    if (images.length === 0) {
      showAlert('error', t('choose_at_least_one_image', { defaultValue: 'Choose at least one image' }))
      return
    }
    if (lineOrderId == null) return
    setIsSaving(true)
    try {
      const res = await saveShippingImages(token ?? undefined, {
        user_id: user?.id,
        line_order_id: lineOrderId,
        images,
        type,
      })
      setIsSaving(false)
      if (res.status === true) {
        void Swal.fire({
          icon: 'success',
          title: t('info', { defaultValue: 'Info' }),
          text: t('saved', { defaultValue: 'Saved' }),
          confirmButtonColor: '#ec11b5',
        }).then(() => navigate(-1))
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

  if (lineOrderId == null) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center text-xs text-ink-soft">
        <p className="text-sm font-medium text-ink">
          {t('invalid_request', { defaultValue: 'Invalid request' })}
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-xs text-ink-soft">
        <img src="/site_images/index_loader.gif" alt="" className="w-[70px] rounded-sm" />
        {t('loading', { defaultValue: 'loading' })}
      </div>
    )
  }

  const uploadDone = pendingUploads === 0

  return (
    <div className="animate-fade-in">
      <section className="px-4 py-6">
        <div>
          <label className="text-xs font-semibold text-ink">
            {t('upload.image_label', { defaultValue: 'Images (max = {nb})', nb: nbFilesAccepted })}
            <span className="ml-1.5 text-[10px] font-normal text-slate-400">
              {t('upload.image_label_error', { defaultValue: 'only images accepted, no video' })}
            </span>
          </label>

          <div
            className="relative mt-2 rounded-xl border-2 border-dashed transition"
            style={isDragging ? { borderColor: 'green' } : undefined}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              onChange(e.dataTransfer.files)
            }}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                onChange(e.target.files)
                e.target.value = ''
              }}
              className="hidden"
            />

            {pendingUploads > 0 && (
              <div className="flex flex-col items-center gap-1 py-8">
                <Loader2 size={22} className="animate-spin text-primary" />
                <span className="text-xs font-semibold text-ink">{t('loading', { defaultValue: 'loading' })}</span>
              </div>
            )}

            <label
              htmlFor="shipping-images-input"
              onClick={(e) => {
                e.preventDefault()
                inputRef.current?.click()
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1 py-6 text-primary ${pendingUploads > 0 ? 'hidden' : ''}`}
            >
              <CloudUpload size={26} />
              <span className="text-[11px] font-semibold">
                {t('publish_add_photo', { defaultValue: 'Add photo' })}
              </span>
            </label>

            {previews.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 px-4 pb-4">
                {previews.map((item, index) => (
                  <div key={`${item.src}-${index}`} className="flex flex-col items-center gap-1">
                    <img src={item.src} alt="" className="h-[90px] w-[90px] rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-red-500"
                      aria-label={t('delete', { defaultValue: 'Delete' })}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-primary px-6 py-2 text-xs font-black uppercase text-primary shadow-soft"
          >
            {t('go_back', { defaultValue: 'Go back' })}
          </button>
          <button
            type="button"
            disabled={!uploadDone || isSaving}
            onClick={() => void save()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep px-6 py-2 text-xs font-black uppercase text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
          >
            {isSaving && <Loader2 size={13} className="animate-spin" />}
            {t('profilForm.save', { defaultValue: 'Save' })}
          </button>
        </div>
      </section>
    </div>
  )
}

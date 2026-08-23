import { useTranslation } from 'react-i18next'

export default function MaintenancePage() {
  const { t } = useTranslation()

  return (
    <div className="animate-fade-in">
      <section className="px-4 py-6">
        <div className="min-h-[500px] rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
          <h3 className="text-center text-lg font-bold text-ink">
            {t('we_on_maintenance', { defaultValue: 'We on maintenance' })}
          </h3>
          <div className="mt-12 flex justify-center">
            <img
              src="/site_images/under_maintenance.jpg"
              alt=""
              className="w-[90%] rounded-[10%]"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

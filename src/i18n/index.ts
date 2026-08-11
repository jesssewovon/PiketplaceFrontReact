import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import resources from '../locales/resources'
import languages from '../locales/languages.json'

export interface LanguageOption {
  name: string
  code: string
  country_code: string
  active: boolean
  order: number
}

export const SUPPORTED_LANGUAGES = languages as LanguageOption[]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.filter((l) => l.active).map((l) => l.code),
    load: 'languageOnly',
    interpolation: {
      prefix: '{',
      suffix: '}',
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'piketplace_lang',
    },
  })

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'
})

document.documentElement.lang = i18n.language
document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'

export default i18n

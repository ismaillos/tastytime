import { getRequestConfig } from 'next-intl/server'
import { defaultLocale } from '@tastytime/i18n'

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? defaultLocale
  const messages = (await import(`../messages/${locale}.json`)).default
  return { locale, messages }
})

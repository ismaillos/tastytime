import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from '@tastytime/i18n'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
})

export const config = {
  matcher: ['/((?!_next|_vercel|api|.*\\..*).*)'],
}

import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { HtmlAttributes } from '@/components/providers/HtmlAttributes'
import { rtlLocales } from '@tastytime/i18n'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()
  const dir = rtlLocales.includes(locale as 'ar') ? 'rtl' : 'ltr'

  return (
    <>
      <HtmlAttributes lang={locale} dir={dir} />
      <NextIntlClientProvider messages={messages}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </NextIntlClientProvider>
    </>
  )
}

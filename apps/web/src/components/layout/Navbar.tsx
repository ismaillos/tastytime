'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

export function Navbar() {
  const t = useTranslations('nav')
  const params = useParams()
  const locale = params.locale as string

  return (
    <nav className="border-b border-neutral-800 bg-neutral-950/95 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
        <Link href={`/${locale}/menu`} className="flex items-center gap-2">
          <span className="text-xl font-black text-yellow-400">Tasty</span>
          <span className="text-xl font-black text-white">Time</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href={`/${locale}/menu`} className="text-sm text-neutral-300 hover:text-white transition-colors">
            {t('menu')}
          </Link>
          <Link href={`/${locale}/auth/login`} className="rounded-xl bg-yellow-400 px-4 py-1.5 text-sm font-semibold text-black hover:bg-yellow-300 transition-colors">
            {t('login')}
          </Link>
        </div>
      </div>
    </nav>
  )
}

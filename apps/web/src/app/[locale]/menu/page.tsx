import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { MenuPage } from '@/components/menu/MenuPage'

export default async function MenuRoute() {
  const t = await getTranslations('menu')
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 animate-pulse" />}>
      <MenuPage />
    </Suspense>
  )
}

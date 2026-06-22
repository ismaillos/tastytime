import { Suspense } from 'react'
import { MenuPage } from '@/components/menu/MenuPage'

export default async function MenuRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 animate-pulse" />}>
      <MenuPage />
    </Suspense>
  )
}

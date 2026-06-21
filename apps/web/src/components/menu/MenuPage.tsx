'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { ProductCard } from './ProductCard'
import { CategoryTabs } from './CategoryTabs'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { Navbar } from '@/components/layout/Navbar'

export function MenuPage() {
  const t = useTranslations('menu')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.menu.categories(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: () => api.menu.products(selectedCategory ?? undefined),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />

      {/* Hero */}
      <div className="relative bg-gradient-to-b from-yellow-500/20 to-neutral-950 px-4 py-12 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-yellow-400 md:text-5xl"
        >
          {t('title')}
        </motion.h1>
        <p className="mt-2 text-neutral-400">Good Food · Good Mood · Great Time</p>
      </div>

      {/* Category tabs */}
      <CategoryTabs
        categories={categories as Array<{ id: string; slug: string; nameFr: string }>}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Product grid */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-neutral-800" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory ?? 'all'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {(products as Array<{
                id: string
                nameFr: string
                descriptionFr: string
                basePrice: string
                images: string[]
                isAvailable: boolean
                prepTimeMinutes: number
              }>).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <CartDrawer />
    </div>
  )
}

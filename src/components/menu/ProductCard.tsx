'use client'
import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ShoppingCart, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/stores/cart.store'
import { CustomizeModal } from './CustomizeModal'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  nameFr: string
  descriptionFr: string
  basePrice: string
  images: string[]
  isAvailable: boolean
  prepTimeMinutes: number
}

export function ProductCard({ product }: { product: Product }) {
  const t = useTranslations('menu')
  const [showCustomize, setShowCustomize] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  function handleQuickAdd() {
    addItem({
      id: product.id,
      nameFr: product.nameFr,
      images: product.images,
      basePrice: Number(product.basePrice),
      selectedOptions: [],
    })
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'group relative overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800',
          !product.isAvailable && 'opacity-50',
        )}
      >
        {/* Image */}
        <div className="relative h-44 w-full overflow-hidden bg-neutral-800">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.nameFr}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">🍔</div>
          )}
          {!product.isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white">
                {t('unavailable')}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-white">{product.nameFr}</h3>
          {product.descriptionFr && (
            <p className="mt-1 line-clamp-2 text-xs text-neutral-400">{product.descriptionFr}</p>
          )}

          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
            <Clock className="h-3 w-3" />
            <span>{product.prepTimeMinutes} min</span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-bold text-yellow-400">
              {Number(product.basePrice).toFixed(0)} MAD
            </span>

            {product.isAvailable && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomize(true)}
                  className="rounded-xl border border-yellow-400 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                >
                  {t('customize')}
                </button>
                <button
                  onClick={handleQuickAdd}
                  className="rounded-xl bg-yellow-400 p-1.5 text-black hover:bg-yellow-300 transition-colors"
                >
                  <ShoppingCart className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {showCustomize && (
        <CustomizeModal
          productId={product.id}
          onClose={() => setShowCustomize(false)}
        />
      )}
    </>
  )
}

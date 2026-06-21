'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { useCartStore } from '@/stores/cart.store'
import type { CartItemOption } from '@tastytime/types'
import { cn } from '@/lib/utils'

interface Props {
  productId: string
  onClose: () => void
}

interface OptionGroup {
  id: string
  nameFr: string
  required: boolean
  maxSelect: number
  options: Array<{ id: string; nameFr: string; priceDelta: string }>
}

interface ProductDetail {
  id: string
  nameFr: string
  descriptionFr: string
  basePrice: string
  images: string[]
  prepTimeMinutes: number
  optionGroups: OptionGroup[]
}

export function CustomizeModal({ productId, onClose }: Props) {
  const t = useTranslations('menu')
  const addItem = useCartStore((s) => s.addItem)
  const [selections, setSelections] = useState<Record<string, string[]>>({})

  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.menu.product(productId) as Promise<ProductDetail>,
  })

  if (!product) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
        <div className="h-64 w-full max-w-lg bg-neutral-900 rounded-t-3xl animate-pulse" />
      </div>
    )
  }

  function toggle(groupId: string, optionId: string, maxSelect: number) {
    setSelections((prev) => {
      const current = prev[groupId] ?? []
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) }
      }
      if (current.length >= maxSelect) {
        // Replace first selection if single-select
        return { ...prev, [groupId]: maxSelect === 1 ? [optionId] : current }
      }
      return { ...prev, [groupId]: [...current, optionId] }
    })
  }

  function handleAddToCart() {
    const selectedOptions: CartItemOption[] = []
    for (const group of product.optionGroups) {
      const selected = selections[group.id] ?? []
      for (const optId of selected) {
        const opt = group.options.find((o) => o.id === optId)
        if (opt) {
          selectedOptions.push({
            optionGroupId: group.id,
            optionGroupName: group.nameFr,
            optionId: opt.id,
            optionName: opt.nameFr,
            priceDelta: Number(opt.priceDelta),
          })
        }
      }
    }

    addItem({
      id: product.id,
      nameFr: product.nameFr,
      images: product.images,
      basePrice: Number(product.basePrice),
      selectedOptions,
    })
    onClose()
  }

  const totalDelta = Object.values(selections)
    .flat()
    .reduce((sum, optId) => {
      for (const g of product.optionGroups) {
        const opt = g.options.find((o) => o.id === optId)
        if (opt) return sum + Number(opt.priceDelta)
      }
      return sum
    }, 0)

  const totalPrice = Number(product.basePrice) + totalDelta

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-lg rounded-t-3xl bg-neutral-900 p-6 max-h-[85vh] overflow-y-auto"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{product.nameFr}</h2>
              <p className="text-sm text-neutral-400">{product.descriptionFr}</p>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Option groups */}
          <div className="mt-6 space-y-6">
            {product.optionGroups.map((group) => (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-white">{group.nameFr}</h3>
                  {group.required && (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                      Requis
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {group.options.map((opt) => {
                    const isSelected = (selections[group.id] ?? []).includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggle(group.id, opt.id, group.maxSelect)}
                        className={cn(
                          'w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors border',
                          isSelected
                            ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                            : 'border-neutral-700 text-neutral-300 hover:border-neutral-500',
                        )}
                      >
                        <span>{opt.nameFr}</span>
                        {Number(opt.priceDelta) > 0 && (
                          <span className="text-yellow-400">+{Number(opt.priceDelta)} MAD</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            className="mt-8 w-full flex items-center justify-between rounded-2xl bg-yellow-400 px-6 py-4 text-black font-bold hover:bg-yellow-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t('addToCart')}
            </span>
            <span>{totalPrice.toFixed(0)} MAD</span>
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

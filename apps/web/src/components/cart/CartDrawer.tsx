'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { useCartStore } from '@/stores/cart.store'

export function CartDrawer() {
  const t = useTranslations('cart')
  const [open, setOpen] = useState(false)
  const { items, subtotal, updateQuantity, removeItem, promoDiscount, tip } = useCartStore()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const deliveryFee = 15
  const total = subtotal() - promoDiscount + deliveryFee + tip

  return (
    <>
      {/* Floating cart button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-yellow-400 px-5 py-3 text-black font-bold shadow-xl hover:bg-yellow-300 transition-colors"
      >
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-yellow-400">
            {itemCount}
          </span>
        )}
        <span>{subtotal().toFixed(0)} MAD</span>
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-neutral-900 flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
            >
              <div className="flex items-center justify-between border-b border-neutral-800 p-5">
                <h2 className="text-xl font-bold text-white">{t('title')}</h2>
                <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-neutral-500">
                    <ShoppingCart className="h-12 w-12 mb-3" />
                    <p>{t('empty')}</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex gap-4 rounded-xl bg-neutral-800 p-4">
                      <div className="flex-1">
                        <p className="font-medium text-white">{item.productName}</p>
                        {item.selectedOptions.length > 0 && (
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {item.selectedOptions.map((o) => o.optionName).join(', ')}
                          </p>
                        )}
                        <p className="text-yellow-400 text-sm mt-1">
                          {item.unitPrice.toFixed(0)} MAD
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-neutral-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="rounded-lg bg-neutral-700 p-1 hover:bg-neutral-600"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="rounded-lg bg-neutral-700 p-1 hover:bg-neutral-600"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="border-t border-neutral-800 p-5 space-y-3">
                  <div className="flex justify-between text-sm text-neutral-400">
                    <span>{t('subtotal')}</span>
                    <span>{subtotal().toFixed(0)} MAD</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-400">
                      <span>Réduction</span>
                      <span>-{promoDiscount.toFixed(0)} MAD</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-neutral-400">
                    <span>{t('deliveryFee')}</span>
                    <span>{deliveryFee} MAD</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-neutral-800 pt-3">
                    <span>{t('total')}</span>
                    <span className="text-yellow-400">{total.toFixed(0)} MAD</span>
                  </div>
                  <button
                    onClick={() => {
                      setOpen(false)
                      router.push(`/${locale}/checkout`)
                    }}
                    className="w-full rounded-2xl bg-yellow-400 py-4 text-black font-bold hover:bg-yellow-300 transition-colors"
                  >
                    {t('checkout')}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

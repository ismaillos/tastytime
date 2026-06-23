'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, X, Plus, Minus, Trash2, Tag, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { useCartStore } from '@/stores/cart.store'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

export function CartDrawer() {
  const t = useTranslations('cart')
  const [open, setOpen] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null)
  const [tipPercent, setTipPercent] = useState<number>(0)

  const {
    items,
    subtotal,
    updateQuantity,
    removeItem,
    promoCode,
    promoDiscount,
    setPromoCode,
    setTip,
    tip,
  } = useCartStore()

  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const deliveryFee = 15
  const total = subtotal() - promoDiscount + deliveryFee + tip

  const TIP_OPTIONS = [0, 5, 10, 15] // percent

  async function applyPromo() {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    setPromoError(null)
    setPromoSuccess(null)

    try {
      const res = await fetch(`${API}/api/marketing/promo/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
        body: JSON.stringify({ code: promoInput.trim(), subtotal: subtotal() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setPromoCode(promoInput.trim().toUpperCase(), data.data.discount)
      setPromoSuccess(`Code appliqué — ${data.data.discount.toFixed(0)} MAD de réduction`)
      setPromoInput('')
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Code invalide')
    } finally {
      setPromoLoading(false)
    }
  }

  function handleTipChange(pct: number) {
    const tipAmount = (subtotal() * pct) / 100
    setTipPercent(pct)
    setTip(tipAmount)
  }

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
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 p-5">
                <h2 className="text-xl font-bold text-white">{t('title')}</h2>
                <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-neutral-500">
                    <ShoppingCart className="h-12 w-12 mb-3 opacity-40" />
                    <p>{t('empty')}</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-xl bg-neutral-800 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">{item.productName}</p>
                        {item.selectedOptions.length > 0 && (
                          <p className="text-xs text-neutral-400 mt-0.5 truncate">
                            {item.selectedOptions.map((o) => o.optionName).join(', ')}
                          </p>
                        )}
                        <p className="text-yellow-400 text-sm font-semibold mt-1">
                          {item.unitPrice.toFixed(0)} MAD
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-neutral-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="rounded-lg bg-neutral-700 p-1 hover:bg-neutral-600"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
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
                <div className="border-t border-neutral-800 p-5 space-y-4">
                  {/* Promo code */}
                  {!promoCode ? (
                    <div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                          <input
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                            placeholder={t('promoCode')}
                            className="w-full rounded-xl bg-neutral-800 border border-neutral-700 pl-9 pr-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-yellow-400 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={applyPromo}
                          disabled={promoLoading || !promoInput.trim()}
                          className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-50 transition-colors"
                        >
                          {promoLoading ? '...' : t('applyPromo')}
                        </button>
                      </div>
                      {promoError && <p className="mt-1.5 text-xs text-red-400">{promoError}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl bg-green-500/10 border border-green-500/30 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-green-400 font-medium">{promoCode}</span>
                        <span className="text-xs text-green-400">-{promoDiscount.toFixed(0)} MAD</span>
                      </div>
                      <button
                        onClick={() => { setPromoCode(null, 0); setPromoSuccess(null) }}
                        className="text-neutral-500 hover:text-neutral-300"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {promoSuccess && !promoCode && (
                    <p className="text-xs text-green-400">{promoSuccess}</p>
                  )}

                  {/* Tip selector */}
                  <div>
                    <p className="text-xs font-medium text-neutral-400 mb-2">{t('tip')}</p>
                    <div className="flex gap-2">
                      {TIP_OPTIONS.map((pct) => (
                        <button
                          key={pct}
                          onClick={() => handleTipChange(pct)}
                          className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
                            tipPercent === pct
                              ? 'bg-yellow-400 text-black'
                              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                          }`}
                        >
                          {pct === 0 ? 'Non' : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-neutral-400">
                      <span>{t('subtotal')}</span>
                      <span>{subtotal().toFixed(0)} MAD</span>
                    </div>
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>Réduction</span>
                        <span>-{promoDiscount.toFixed(0)} MAD</span>
                      </div>
                    )}
                    <div className="flex justify-between text-neutral-400">
                      <span>{t('deliveryFee')}</span>
                      <span>{deliveryFee} MAD</span>
                    </div>
                    {tip > 0 && (
                      <div className="flex justify-between text-neutral-400">
                        <span>{t('tip')}</span>
                        <span>{tip.toFixed(0)} MAD</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-white pt-2 border-t border-neutral-800">
                      <span>{t('total')}</span>
                      <span className="text-yellow-400">{total.toFixed(0)} MAD</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { setOpen(false); router.push(`/${locale}/checkout`) }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-4 text-black font-bold hover:bg-yellow-300 transition-colors"
                  >
                    {t('checkout')}
                    <ChevronRight className="h-4 w-4" />
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

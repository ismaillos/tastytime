'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkoutSchema, type CheckoutInput } from '@tastytime/validators'
import { useCartStore } from '@/stores/cart.store'
import { api } from '@/lib/api'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { MapPin, Phone, User, FileText, Truck, Store, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'

const ORDER_TYPES = [
  { value: 'delivery', labelKey: 'delivery', icon: Truck },
  { value: 'pickup', labelKey: 'pickup', icon: Store },
  { value: 'eat_in', labelKey: 'eatIn', icon: UtensilsCrossed },
] as const

export default function CheckoutPage() {
  const t = useTranslations('checkout')
  const cartT = useTranslations('cart')
  const { items, subtotal, promoCode, promoDiscount, tip, clear } = useCartStore()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderType, setOrderType] = useState<'delivery' | 'pickup' | 'eat_in'>('delivery')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { type: 'delivery', tip: 0 },
  })

  const deliveryFee = orderType === 'delivery' ? 15 : 0
  const total = subtotal() - promoDiscount + deliveryFee + tip

  async function onSubmit(data: CheckoutInput) {
    setIsSubmitting(true)
    try {
      const order = await api.orders.create({
        ...data,
        type: orderType,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          selectedOptions: i.selectedOptions,
        })),
        promoCode,
        tip,
      }) as { id: string }

      clear()
      router.push(`/${locale}/orders/${order.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (items.length === 0) {
    router.push(`/${locale}/menu`)
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-yellow-400">{t('title')}</h1>

        {/* Order type */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-neutral-300">{t('orderType')}</label>
          <div className="grid grid-cols-3 gap-3">
            {ORDER_TYPES.map(({ value, labelKey, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setOrderType(value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors',
                  orderType === value
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                    : 'border-neutral-700 text-neutral-400 hover:border-neutral-500',
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-medium">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">{t('name')}</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
              <input
                {...register('customerName')}
                placeholder="Votre nom"
                className="w-full rounded-xl bg-neutral-800 border border-neutral-700 pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:border-yellow-400 focus:outline-none"
              />
            </div>
            {errors.customerName && (
              <p className="mt-1 text-xs text-red-400">{errors.customerName.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">{t('phone')}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
              <input
                {...register('customerPhone')}
                placeholder="+212 6XX XX XX XX"
                className="w-full rounded-xl bg-neutral-800 border border-neutral-700 pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Address (delivery only) */}
          {orderType === 'delivery' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-300">{t('address')}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                <textarea
                  {...register('address')}
                  rows={2}
                  placeholder="Adresse complète..."
                  className="w-full rounded-xl bg-neutral-800 border border-neutral-700 pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:border-yellow-400 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Table (eat in only) */}
          {orderType === 'eat_in' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-300">{t('table')}</label>
              <input
                {...register('tableNumber')}
                placeholder="Numéro de table"
                className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-3 text-white placeholder-neutral-500 focus:border-yellow-400 focus:outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">{t('notes')}</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="Allergies, préférences..."
                className="w-full rounded-xl bg-neutral-800 border border-neutral-700 pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:border-yellow-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Payment info */}
          <div className="rounded-xl bg-neutral-800 border border-neutral-700 p-4">
            <p className="text-sm font-medium text-neutral-300 mb-1">{t('paymentMethod')}</p>
            <p className="text-yellow-400 font-semibold">{t('cashOnDelivery')}</p>
          </div>

          {/* Order summary */}
          <div className="rounded-xl bg-neutral-800 border border-neutral-700 p-4 space-y-2">
            <div className="flex justify-between text-sm text-neutral-400">
              <span>{cartT('subtotal')}</span>
              <span>{subtotal().toFixed(0)} MAD</span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-400">
                <span>Réduction</span>
                <span>-{promoDiscount.toFixed(0)} MAD</span>
              </div>
            )}
            {orderType === 'delivery' && (
              <div className="flex justify-between text-sm text-neutral-400">
                <span>{cartT('deliveryFee')}</span>
                <span>15 MAD</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white border-t border-neutral-700 pt-2">
              <span>{cartT('total')}</span>
              <span className="text-yellow-400">{total.toFixed(0)} MAD</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-yellow-400 py-4 text-black font-bold text-lg hover:bg-yellow-300 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Traitement...' : t('placeOrder')}
          </button>
        </form>
      </div>
    </div>
  )
}

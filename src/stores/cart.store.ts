'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, CartItemOption } from '@tastytime/types'
import { nanoid } from 'nanoid'

interface CartState {
  items: CartItem[]
  promoCode: string | null
  promoDiscount: number
  tip: number
  addItem: (product: {
    id: string
    nameFr: string
    images: string[]
    basePrice: number
    selectedOptions: CartItemOption[]
  }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  setPromoCode: (code: string | null, discount: number) => void
  setTip: (tip: number) => void
  clear: () => void
  subtotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      promoDiscount: 0,
      tip: 0,

      addItem: (product) => {
        const optionsDelta = product.selectedOptions.reduce((sum, o) => sum + o.priceDelta, 0)
        const unitPrice = product.basePrice + optionsDelta
        const newItem: CartItem = {
          id: nanoid(),
          productId: product.id,
          productName: product.nameFr,
          productImage: product.images[0] ?? null,
          basePrice: product.basePrice,
          quantity: 1,
          selectedOptions: product.selectedOptions,
          unitPrice,
          totalPrice: unitPrice,
        }
        set((s) => ({ items: [...s.items, newItem] }))
      },

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) =>
        set((s) => ({
          items: quantity <= 0
            ? s.items.filter((i) => i.id !== id)
            : s.items.map((i) =>
                i.id === id
                  ? { ...i, quantity, totalPrice: i.unitPrice * quantity }
                  : i,
              ),
        })),

      setPromoCode: (code, discount) =>
        set({ promoCode: code, promoDiscount: discount }),

      setTip: (tip) => set({ tip }),

      clear: () => set({ items: [], promoCode: null, promoDiscount: 0, tip: 0 }),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.totalPrice, 0),
    }),
    { name: 'tastytime-cart' },
  ),
)

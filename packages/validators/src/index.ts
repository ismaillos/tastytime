import { z } from 'zod'

// ─── Shared ────────────────────────────────────────────────────────────────────
export const localizedStringSchema = z.object({
  fr: z.string().min(1),
  en: z.string().min(1),
  ar: z.string().min(1),
})

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const signUpSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  phone: z.string().optional(),
})

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── Menu ──────────────────────────────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: localizedStringSchema,
  imageUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
})

export const createOptionSchema = z.object({
  name: localizedStringSchema,
  priceDelta: z.number().min(0).default(0),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
})

export const createOptionGroupSchema = z.object({
  name: localizedStringSchema,
  required: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  sortOrder: z.number().int().nonnegative().default(0),
  options: z.array(createOptionSchema).default([]),
})

export const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: localizedStringSchema,
  description: localizedStringSchema,
  ingredients: localizedStringSchema,
  allergens: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  basePrice: z.number().positive(),
  calories: z.number().int().positive().nullable().optional(),
  prepTimeMinutes: z.number().int().positive().default(15),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
  optionGroups: z.array(createOptionGroupSchema).default([]),
})

// ─── Cart / Order ──────────────────────────────────────────────────────────────
export const cartItemOptionSchema = z.object({
  optionGroupId: z.string().uuid(),
  optionGroupName: z.string(),
  optionId: z.string().uuid(),
  optionName: z.string(),
  priceDelta: z.number(),
})

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  selectedOptions: z.array(cartItemOptionSchema).default([]),
})

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  type: z.enum(['delivery', 'pickup', 'eat_in']),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(8).max(20),
  address: z.string().min(5).max(500).nullable().optional(),
  tableNumber: z.string().max(10).nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  promoCode: z.string().max(50).nullable().optional(),
  tip: z.number().min(0).default(0),
})

// ─── Staff ─────────────────────────────────────────────────────────────────────
export const inviteStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['manager', 'cashier', 'kitchen', 'driver']),
})

// ─── Promo ─────────────────────────────────────────────────────────────────────
export const createPromoSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  type: z.enum(['percentage', 'fixed', 'free_item']),
  value: z.number().positive(),
  minOrderAmount: z.number().positive().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date().nullable().optional(),
})

// ─── Driver ────────────────────────────────────────────────────────────────────
export const updateDriverLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'accepted',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ]),
  note: z.string().max(200).optional(),
})

// ─── Exports ───────────────────────────────────────────────────────────────────
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type CreateProductInput = z.infer<typeof createProductSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>

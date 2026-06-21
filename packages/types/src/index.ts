// ─── Locale ───────────────────────────────────────────────────────────────────
export type Locale = 'fr' | 'en' | 'ar'
export type LocalizedString = Record<Locale, string>

// ─── Tenant ───────────────────────────────────────────────────────────────────
export interface Tenant {
  id: string
  slug: string
  name: string
  schema: string
  currency: 'MAD' | 'EUR' | 'USD'
  defaultLocale: Locale
  logoUrl: string | null
  address: string | null
  phone: string | null
  createdAt: Date
}

// ─── User ─────────────────────────────────────────────────────────────────────
export type UserRole = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'driver' | 'customer'

export interface User {
  id: string
  tenantId: string
  email: string
  name: string
  phone: string | null
  role: UserRole
  avatarUrl: string | null
  loyaltyPoints: number
  createdAt: Date
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
export interface Category {
  id: string
  slug: string
  name: LocalizedString
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
}

export interface OptionGroup {
  id: string
  productId: string
  name: LocalizedString
  required: boolean
  minSelect: number
  maxSelect: number
  sortOrder: number
}

export interface Option {
  id: string
  optionGroupId: string
  name: LocalizedString
  priceDelta: number
  isAvailable: boolean
  sortOrder: number
}

export interface Product {
  id: string
  categoryId: string
  name: LocalizedString
  description: LocalizedString
  ingredients: LocalizedString
  allergens: string[]
  images: string[]
  basePrice: number
  calories: number | null
  prepTimeMinutes: number
  isAvailable: boolean
  sortOrder: number
  optionGroups: OptionGroup[]
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export interface CartItemOption {
  optionGroupId: string
  optionGroupName: string
  optionId: string
  optionName: string
  priceDelta: number
}

export interface CartItem {
  id: string
  productId: string
  productName: string
  productImage: string | null
  basePrice: number
  quantity: number
  selectedOptions: CartItemOption[]
  unitPrice: number
  totalPrice: number
}

// ─── Order ────────────────────────────────────────────────────────────────────
export type OrderType = 'delivery' | 'pickup' | 'eat_in'

export type OrderStatus =
  | 'received'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  customizations: CartItemOption[]
}

export interface Order {
  id: string
  customerId: string | null
  customerName: string
  customerPhone: string
  type: OrderType
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  tip: number
  tax: number
  total: number
  promoCodeId: string | null
  promoDiscount: number
  address: string | null
  tableNumber: string | null
  scheduledAt: Date | null
  notes: string | null
  driverId: string | null
  estimatedPrepMinutes: number
  createdAt: Date
  updatedAt: Date
}

// ─── Loyalty ──────────────────────────────────────────────────────────────────
export type LoyaltyEventType =
  | 'order_completed'
  | 'referral_bonus'
  | 'birthday_gift'
  | 'coupon_redemption'
  | 'manual_adjustment'

export interface LoyaltyTransaction {
  id: string
  customerId: string
  points: number
  eventType: LoyaltyEventType
  orderId: string | null
  createdAt: Date
}

// ─── Promo ────────────────────────────────────────────────────────────────────
export type PromoType = 'percentage' | 'fixed' | 'free_item'

export interface PromoCode {
  id: string
  code: string
  type: PromoType
  value: number
  minOrderAmount: number | null
  maxUses: number | null
  usedCount: number
  validFrom: Date
  validUntil: Date | null
  isActive: boolean
}

// ─── Notifications ────────────────────────────────────────────────────────────
export type NotificationChannel = 'push' | 'email' | 'whatsapp' | 'sms'
export type NotificationEvent =
  | 'order_received'
  | 'order_accepted'
  | 'order_preparing'
  | 'order_ready'
  | 'order_out_for_delivery'
  | 'order_delivered'
  | 'order_cancelled'

// ─── Driver ───────────────────────────────────────────────────────────────────
export interface Driver {
  id: string
  userId: string
  name: string
  phone: string
  isOnline: boolean
  currentLat: number | null
  currentLng: number | null
  assignedOrderId: string | null
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export interface DailySalesReport {
  date: string
  totalOrders: number
  totalRevenue: number
  averageBasket: number
  cancelledOrders: number
  topProducts: Array<{ productId: string; name: string; count: number }>
  peakHours: Array<{ hour: number; orderCount: number }>
}

// ─── API responses ────────────────────────────────────────────────────────────
export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Socket.IO events ─────────────────────────────────────────────────────────
export interface ServerToClientEvents {
  'order:status_changed': (payload: { orderId: string; status: OrderStatus }) => void
  'order:new': (payload: Order) => void
  'driver:location': (payload: { driverId: string; lat: number; lng: number }) => void
}

export interface ClientToServerEvents {
  'order:track': (orderId: string) => void
  'driver:update_location': (payload: { lat: number; lng: number }) => void
}

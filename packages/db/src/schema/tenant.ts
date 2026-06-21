import {
  pgTable,
  pgSchema,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  json,
  uuid,
} from 'drizzle-orm/pg-core'

// Factory: creates all tenant-scoped tables within a given PostgreSQL schema.
export function createTenantSchema(schemaName: string) {
  const schema = pgSchema(schemaName)

  const users = schema.table('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    phone: text('phone'),
    role: text('role').notNull().default('customer'),
    avatarUrl: text('avatar_url'),
    loyaltyPoints: integer('loyalty_points').notNull().default(0),
    birthday: text('birthday'),
    referredBy: text('referred_by'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  })

  const categories = schema.table('categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    nameFr: text('name_fr').notNull(),
    nameEn: text('name_en').notNull(),
    nameAr: text('name_ar').notNull(),
    imageUrl: text('image_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  })

  const products = schema.table('products', {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id').notNull().references(() => categories.id),
    nameFr: text('name_fr').notNull(),
    nameEn: text('name_en').notNull(),
    nameAr: text('name_ar').notNull(),
    descriptionFr: text('description_fr').notNull().default(''),
    descriptionEn: text('description_en').notNull().default(''),
    descriptionAr: text('description_ar').notNull().default(''),
    ingredientsFr: text('ingredients_fr').notNull().default(''),
    ingredientsEn: text('ingredients_en').notNull().default(''),
    ingredientsAr: text('ingredients_ar').notNull().default(''),
    allergens: json('allergens').$type<string[]>().notNull().default([]),
    images: json('images').$type<string[]>().notNull().default([]),
    basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
    calories: integer('calories'),
    prepTimeMinutes: integer('prep_time_minutes').notNull().default(15),
    isAvailable: boolean('is_available').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  })

  const optionGroups = schema.table('option_groups', {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    nameFr: text('name_fr').notNull(),
    nameEn: text('name_en').notNull(),
    nameAr: text('name_ar').notNull(),
    required: boolean('required').notNull().default(false),
    minSelect: integer('min_select').notNull().default(0),
    maxSelect: integer('max_select').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
  })

  const options = schema.table('options', {
    id: uuid('id').primaryKey().defaultRandom(),
    optionGroupId: uuid('option_group_id').notNull().references(() => optionGroups.id, { onDelete: 'cascade' }),
    nameFr: text('name_fr').notNull(),
    nameEn: text('name_en').notNull(),
    nameAr: text('name_ar').notNull(),
    priceDelta: numeric('price_delta', { precision: 10, scale: 2 }).notNull().default('0'),
    isAvailable: boolean('is_available').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
  })

  const promoCodes = schema.table('promo_codes', {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    type: text('type').notNull(),
    value: numeric('value', { precision: 10, scale: 2 }).notNull(),
    minOrderAmount: numeric('min_order_amount', { precision: 10, scale: 2 }),
    maxUses: integer('max_uses'),
    usedCount: integer('used_count').notNull().default(0),
    validFrom: timestamp('valid_from').notNull().defaultNow(),
    validUntil: timestamp('valid_until'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  })

  const orders = schema.table('orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: text('customer_id').references(() => users.id),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    type: text('type').notNull(),
    status: text('status').notNull().default('received'),
    items: json('items').notNull().default([]),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    deliveryFee: numeric('delivery_fee', { precision: 10, scale: 2 }).notNull().default('0'),
    tip: numeric('tip', { precision: 10, scale: 2 }).notNull().default('0'),
    tax: numeric('tax', { precision: 10, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    promoCodeId: uuid('promo_code_id').references(() => promoCodes.id),
    promoDiscount: numeric('promo_discount', { precision: 10, scale: 2 }).notNull().default('0'),
    address: text('address'),
    tableNumber: text('table_number'),
    scheduledAt: timestamp('scheduled_at'),
    notes: text('notes'),
    driverId: text('driver_id'),
    estimatedPrepMinutes: integer('estimated_prep_minutes').notNull().default(20),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  })

  const loyaltyTransactions = schema.table('loyalty_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: text('customer_id').notNull().references(() => users.id),
    points: integer('points').notNull(),
    eventType: text('event_type').notNull(),
    orderId: uuid('order_id').references(() => orders.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  })

  const inventory = schema.table('inventory', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    unit: text('unit').notNull().default('g'),
    currentStock: numeric('current_stock', { precision: 10, scale: 2 }).notNull().default('0'),
    lowStockThreshold: numeric('low_stock_threshold', { precision: 10, scale: 2 }).notNull().default('0'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  })

  const drivers = schema.table('drivers', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => users.id),
    isOnline: boolean('is_online').notNull().default(false),
    currentLat: numeric('current_lat', { precision: 10, scale: 7 }),
    currentLng: numeric('current_lng', { precision: 10, scale: 7 }),
    assignedOrderId: uuid('assigned_order_id').references(() => orders.id),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  })

  return {
    schema,
    users,
    categories,
    products,
    optionGroups,
    options,
    promoCodes,
    orders,
    loyaltyTransactions,
    inventory,
    drivers,
  }
}

export type TenantTables = ReturnType<typeof createTenantSchema>

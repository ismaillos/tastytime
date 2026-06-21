import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgSchema,
} from 'drizzle-orm/pg-core'

// Public schema — shared across all tenants
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  schema: text('schema').notNull().unique(),
  currency: text('currency').notNull().default('MAD'),
  defaultLocale: text('default_locale').notNull().default('fr'),
  logoUrl: text('logo_url'),
  address: text('address'),
  phone: text('phone'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type TenantRecord = typeof tenants.$inferSelect
export type NewTenantRecord = typeof tenants.$inferInsert

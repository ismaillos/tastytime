import { Hono } from 'hono'
import { createRouter, type HonoEnv } from '@/lib/api/types'
import { createTenantDb } from '@tastytime/db'
import { createTenantSchema } from '@tastytime/db'
import { eq, asc, and } from 'drizzle-orm'
import { createLogger } from '@tastytime/logger'
import type { TenantRecord } from '@tastytime/db'

const log = createLogger({ module: 'menu-route' })

export const menuRouter = createRouter()

// GET /menu/categories — public
menuRouter.get('/categories', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)

  const rows = await db
    .select()
    .from(tables.categories)
    .where(eq(tables.categories.isActive, true))
    .orderBy(asc(tables.categories.sortOrder))

  return c.json({ success: true, data: rows })
})

// GET /menu/products — public, optionally filtered by ?categoryId=
menuRouter.get('/products', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const categoryId = c.req.query('categoryId')

  const rows = await db
    .select()
    .from(tables.products)
    .where(
      categoryId
        ? and(eq(tables.products.categoryId, categoryId), eq(tables.products.isAvailable, true))
        : eq(tables.products.isAvailable, true),
    )
    .orderBy(asc(tables.products.sortOrder))

  return c.json({ success: true, data: rows })
})

// GET /menu/products/:id — public, includes option groups
menuRouter.get('/products/:id', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const id = c.req.param('id')

  const [product] = await db
    .select()
    .from(tables.products)
    .where(eq(tables.products.id, id))
    .limit(1)

  if (!product) {
    return c.json({ success: false, error: 'Product not found' }, 404)
  }

  const groups = await db
    .select()
    .from(tables.optionGroups)
    .where(eq(tables.optionGroups.productId, id))
    .orderBy(asc(tables.optionGroups.sortOrder))

  const opts = await db
    .select()
    .from(tables.options)
    .orderBy(asc(tables.options.sortOrder))

  const groupsWithOptions = groups.map((g) => ({
    ...g,
    options: opts.filter((o) => o.optionGroupId === g.id),
  }))

  return c.json({ success: true, data: { ...product, optionGroups: groupsWithOptions } })
})

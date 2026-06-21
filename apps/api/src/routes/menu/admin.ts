import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createProductSchema, createCategorySchema } from '@tastytime/validators'
import { createTenantDb, createTenantSchema } from '@tastytime/db'
import { eq, asc } from 'drizzle-orm'
import { createLogger } from '@tastytime/logger'
import type { TenantRecord } from '@tastytime/db'

const log = createLogger({ module: 'menu-admin-route' })

export const menuAdminRouter = new Hono()

// ─── Categories ───────────────────────────────────────────────────────────────

menuAdminRouter.post('/categories', zValidator('json', createCategorySchema), async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const body = c.req.valid('json')

  const slug = body.name.fr.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const [cat] = await db
    .insert(tables.categories)
    .values({
      slug,
      nameFr: body.name.fr,
      nameEn: body.name.en,
      nameAr: body.name.ar,
      imageUrl: body.imageUrl ?? null,
      sortOrder: body.sortOrder,
    })
    .returning()

  log.info({ slug, tenantId: tenant.id }, 'Category created')
  return c.json({ success: true, data: cat }, 201)
})

menuAdminRouter.patch('/categories/:id', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const id = c.req.param('id')
  const body = await c.req.json()

  const [cat] = await db
    .update(tables.categories)
    .set({
      ...(body.name && { nameFr: body.name.fr, nameEn: body.name.en, nameAr: body.name.ar }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    })
    .where(eq(tables.categories.id, id))
    .returning()

  return c.json({ success: true, data: cat })
})

menuAdminRouter.delete('/categories/:id', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)

  await db
    .update(tables.categories)
    .set({ isActive: false })
    .where(eq(tables.categories.id, c.req.param('id')))

  return c.json({ success: true })
})

// ─── Products ─────────────────────────────────────────────────────────────────

menuAdminRouter.post('/products', zValidator('json', createProductSchema), async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const body = c.req.valid('json')

  const [product] = await db
    .insert(tables.products)
    .values({
      categoryId: body.categoryId,
      nameFr: body.name.fr,
      nameEn: body.name.en,
      nameAr: body.name.ar,
      descriptionFr: body.description.fr,
      descriptionEn: body.description.en,
      descriptionAr: body.description.ar,
      ingredientsFr: body.ingredients.fr,
      ingredientsEn: body.ingredients.en,
      ingredientsAr: body.ingredients.ar,
      allergens: body.allergens,
      images: body.images,
      basePrice: body.basePrice.toString(),
      calories: body.calories ?? null,
      prepTimeMinutes: body.prepTimeMinutes,
      isAvailable: body.isAvailable,
      sortOrder: body.sortOrder,
    })
    .returning()

  if (!product) return c.json({ success: false, error: 'Failed to create product' }, 500)

  // Insert option groups + options
  for (let gi = 0; gi < body.optionGroups.length; gi++) {
    const g = body.optionGroups[gi]!
    const [group] = await db
      .insert(tables.optionGroups)
      .values({
        productId: product.id,
        nameFr: g.name.fr,
        nameEn: g.name.en,
        nameAr: g.name.ar,
        required: g.required,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        sortOrder: gi,
      })
      .returning()

    if (!group) continue

    for (let oi = 0; oi < g.options.length; oi++) {
      const o = g.options[oi]!
      await db.insert(tables.options).values({
        optionGroupId: group.id,
        nameFr: o.name.fr,
        nameEn: o.name.en,
        nameAr: o.name.ar,
        priceDelta: o.priceDelta.toString(),
        isAvailable: o.isAvailable,
        sortOrder: oi,
      })
    }
  }

  log.info({ productId: product.id, tenantId: tenant.id }, 'Product created')
  return c.json({ success: true, data: product }, 201)
})

menuAdminRouter.patch('/products/:id', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const id = c.req.param('id')
  const body = await c.req.json()

  const [product] = await db
    .update(tables.products)
    .set({
      ...(body.name && { nameFr: body.name.fr, nameEn: body.name.en, nameAr: body.name.ar }),
      ...(body.description && { descriptionFr: body.description.fr, descriptionEn: body.description.en, descriptionAr: body.description.ar }),
      ...(body.basePrice !== undefined && { basePrice: body.basePrice.toString() }),
      ...(body.isAvailable !== undefined && { isAvailable: body.isAvailable }),
      ...(body.images !== undefined && { images: body.images }),
      ...(body.allergens !== undefined && { allergens: body.allergens }),
      ...(body.prepTimeMinutes !== undefined && { prepTimeMinutes: body.prepTimeMinutes }),
      updatedAt: new Date(),
    })
    .where(eq(tables.products.id, id))
    .returning()

  return c.json({ success: true, data: product })
})

menuAdminRouter.delete('/products/:id', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)

  await db
    .update(tables.products)
    .set({ isAvailable: false, updatedAt: new Date() })
    .where(eq(tables.products.id, c.req.param('id')))

  return c.json({ success: true })
})

// Toggle product availability
menuAdminRouter.patch('/products/:id/availability', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const { isAvailable } = await c.req.json<{ isAvailable: boolean }>()

  const [product] = await db
    .update(tables.products)
    .set({ isAvailable, updatedAt: new Date() })
    .where(eq(tables.products.id, c.req.param('id')))
    .returning()

  return c.json({ success: true, data: product })
})

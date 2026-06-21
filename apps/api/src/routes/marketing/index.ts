import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createPromoSchema } from '@tastytime/validators'
import { createTenantDb, createTenantSchema } from '@tastytime/db'
import { eq, and, lte, gte } from 'drizzle-orm'
import { createLogger } from '@tastytime/logger'
import type { TenantRecord } from '@tastytime/db'

const log = createLogger({ module: 'marketing-route' })

export const marketingRouter = new Hono()

// POST /marketing/promo — create promo code (staff only)
marketingRouter.post('/promo', zValidator('json', createPromoSchema), async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const body = c.req.valid('json')

  const [promo] = await db
    .insert(tables.promoCodes)
    .values({
      code: body.code,
      type: body.type,
      value: body.value.toString(),
      minOrderAmount: body.minOrderAmount?.toString() ?? null,
      maxUses: body.maxUses ?? null,
      validFrom: body.validFrom,
      validUntil: body.validUntil ?? null,
    })
    .returning()

  log.info({ code: body.code, tenantId: tenant.id }, 'Promo code created')
  return c.json({ success: true, data: promo }, 201)
})

// GET /marketing/promo — list all promo codes (staff)
marketingRouter.get('/promo', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)

  const promos = await db.select().from(tables.promoCodes)
  return c.json({ success: true, data: promos })
})

// POST /marketing/promo/validate — validate a code before checkout
marketingRouter.post('/promo/validate', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const { code, subtotal } = await c.req.json<{ code: string; subtotal: number }>()

  const [promo] = await db
    .select()
    .from(tables.promoCodes)
    .where(eq(tables.promoCodes.code, code.toUpperCase()))
    .limit(1)

  if (!promo || !promo.isActive) {
    return c.json({ success: false, error: 'Code invalide ou expiré' }, 422)
  }
  if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
    return c.json({ success: false, error: 'Code expiré' }, 422)
  }
  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    return c.json({ success: false, error: 'Code épuisé' }, 422)
  }
  if (promo.minOrderAmount && subtotal < Number(promo.minOrderAmount)) {
    return c.json({
      success: false,
      error: `Minimum ${promo.minOrderAmount} MAD requis`,
    }, 422)
  }

  let discount = 0
  if (promo.type === 'percentage') discount = (subtotal * Number(promo.value)) / 100
  else if (promo.type === 'fixed') discount = Math.min(Number(promo.value), subtotal)

  return c.json({ success: true, data: { promo, discount } })
})

// DELETE /marketing/promo/:id — deactivate promo
marketingRouter.delete('/promo/:id', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)

  await db
    .update(tables.promoCodes)
    .set({ isActive: false })
    .where(eq(tables.promoCodes.id, c.req.param('id')))

  return c.json({ success: true })
})

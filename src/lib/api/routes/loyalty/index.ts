import { Hono } from 'hono'
import { createRouter, type HonoEnv } from '@/lib/api/types'
import { createTenantDb, createTenantSchema } from '@tastytime/db'
import { eq, sum, desc } from 'drizzle-orm'
import { createLogger } from '@tastytime/logger'
import type { TenantRecord } from '@tastytime/db'

const log = createLogger({ module: 'loyalty-route' })

export const loyaltyRouter = createRouter()

const POINTS_PER_MAD = 1 // 1 point per 1 MAD spent

// GET /loyalty — get current user's points + history
loyaltyRouter.get('/', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const user = c.get('user') as { id: string }
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)

  const [userData] = await db
    .select({ loyaltyPoints: tables.users.loyaltyPoints })
    .from(tables.users)
    .where(eq(tables.users.id, user.id))
    .limit(1)

  const history = await db
    .select()
    .from(tables.loyaltyTransactions)
    .where(eq(tables.loyaltyTransactions.customerId, user.id))
    .orderBy(desc(tables.loyaltyTransactions.createdAt))
    .limit(20)

  return c.json({ success: true, data: { points: userData?.loyaltyPoints ?? 0, history } })
})

// POST /loyalty/credit — internal: credit points after order completion
loyaltyRouter.post('/credit', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const { customerId, orderId, orderTotal } = await c.req.json<{
    customerId: string
    orderId: string
    orderTotal: number
  }>()

  const points = Math.floor(orderTotal * POINTS_PER_MAD)

  await db.insert(tables.loyaltyTransactions).values({
    customerId,
    points,
    eventType: 'order_completed',
    orderId,
  })

  await db
    .update(tables.users)
    .set({ loyaltyPoints: db.$count(tables.loyaltyTransactions) as unknown as number })
    .where(eq(tables.users.id, customerId))

  // Simpler: increment directly via raw SQL
  const [user] = await db
    .select({ loyaltyPoints: tables.users.loyaltyPoints })
    .from(tables.users)
    .where(eq(tables.users.id, customerId))
    .limit(1)

  const newTotal = (user?.loyaltyPoints ?? 0) + points

  await db
    .update(tables.users)
    .set({ loyaltyPoints: newTotal })
    .where(eq(tables.users.id, customerId))

  log.info({ customerId, points, orderId }, 'Loyalty points credited')
  return c.json({ success: true, data: { points, newTotal } })
})

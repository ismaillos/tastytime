import { Hono } from 'hono'
import { createRouter, type HonoEnv } from '@/lib/api/types'
import { createTenantDb, createTenantSchema } from '@tastytime/db'
import { desc, gte } from 'drizzle-orm'
import { createLogger } from '@tastytime/logger'
import type { TenantRecord } from '@tastytime/db'

const log = createLogger({ module: 'dashboard-route' })

export const dashboardRouter = createRouter()

// GET /dashboard/stats — daily snapshot
dashboardRouter.get('/stats', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const orders = await db
    .select()
    .from(tables.orders)
    .where(gte(tables.orders.createdAt, todayStart))
    .orderBy(desc(tables.orders.createdAt))

  const completed = orders.filter((o) => o.status === 'delivered')
  const cancelled = orders.filter((o) => o.status === 'cancelled')
  const totalRevenue = completed.reduce((sum, o) => sum + Number(o.total), 0)
  const averageBasket = completed.length ? totalRevenue / completed.length : 0

  // Peak hours: count orders by hour
  const peakHours: Record<number, number> = {}
  for (const o of orders) {
    const h = new Date(o.createdAt).getHours()
    peakHours[h] = (peakHours[h] ?? 0) + 1
  }

  log.debug({ tenantId: tenant.id, ordersToday: orders.length }, 'Dashboard stats fetched')

  return c.json({
    success: true,
    data: {
      totalOrders: orders.length,
      completedOrders: completed.length,
      cancelledOrders: cancelled.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageBasket: Math.round(averageBasket * 100) / 100,
      peakHours: Object.entries(peakHours).map(([hour, count]) => ({
        hour: Number(hour),
        orderCount: count,
      })),
      liveOrders: orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)),
    },
  })
})

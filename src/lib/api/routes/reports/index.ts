import { Hono } from 'hono'
import { createRouter, type HonoEnv } from '@/lib/api/types'
import { createTenantDb, createTenantSchema } from '@tastytime/db'
import { gte, lte, and, eq, desc } from 'drizzle-orm'
import { createLogger } from '@tastytime/logger'
import type { TenantRecord } from '@tastytime/db'

const log = createLogger({ module: 'reports-route' })

export const reportsRouter = createRouter()

// GET /reports/sales?from=&to= — sales report
reportsRouter.get('/sales', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)

  const from = c.req.query('from') ? new Date(c.req.query('from')!) : (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })()
  const to = c.req.query('to') ? new Date(c.req.query('to')!) : new Date()

  const orders = await db
    .select()
    .from(tables.orders)
    .where(and(gte(tables.orders.createdAt, from), lte(tables.orders.createdAt, to)))
    .orderBy(desc(tables.orders.createdAt))

  const delivered = orders.filter((o) => o.status === 'delivered')
  const cancelled = orders.filter((o) => o.status === 'cancelled')
  const totalRevenue = delivered.reduce((sum, o) => sum + Number(o.total), 0)
  const averageBasket = delivered.length ? totalRevenue / delivered.length : 0

  // Best sellers
  const productCounts: Record<string, { name: string; count: number }> = {}
  for (const order of delivered) {
    const items = order.items as Array<{ productName: string; quantity: number }>
    for (const item of items) {
      const key = item.productName
      if (!productCounts[key]) productCounts[key] = { name: item.productName, count: 0 }
      productCounts[key]!.count += item.quantity
    }
  }
  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Peak hours
  const peakHours: Record<number, number> = {}
  for (const order of orders) {
    const h = new Date(order.createdAt).getHours()
    peakHours[h] = (peakHours[h] ?? 0) + 1
  }

  // Daily revenue breakdown
  const dailyRevenue: Record<string, number> = {}
  for (const order of delivered) {
    const day = new Date(order.createdAt).toISOString().split('T')[0]!
    dailyRevenue[day] = (dailyRevenue[day] ?? 0) + Number(order.total)
  }

  log.info({ tenantId: tenant.id, from, to, total: orders.length }, 'Sales report generated')

  return c.json({
    success: true,
    data: {
      period: { from, to },
      totalOrders: orders.length,
      completedOrders: delivered.length,
      cancelledOrders: cancelled.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageBasket: Math.round(averageBasket * 100) / 100,
      topProducts,
      peakHours: Object.entries(peakHours)
        .map(([hour, count]) => ({ hour: Number(hour), orderCount: count }))
        .sort((a, b) => a.hour - b.hour),
      dailyRevenue: Object.entries(dailyRevenue)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    },
  })
})

// GET /reports/sales/export?from=&to=&format=csv — export sales data
reportsRouter.get('/sales/export', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)

  const from = c.req.query('from') ? new Date(c.req.query('from')!) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })()
  const to = c.req.query('to') ? new Date(c.req.query('to')!) : new Date()

  const orders = await db
    .select()
    .from(tables.orders)
    .where(and(gte(tables.orders.createdAt, from), lte(tables.orders.createdAt, to)))
    .orderBy(desc(tables.orders.createdAt))

  const header = 'ID,Date,Client,Téléphone,Type,Statut,Sous-total,Frais livraison,Pourboire,Total\r\n'
  const rows = orders.map((o) => {
    const date = new Date(o.createdAt).toLocaleString('fr-MA')
    return [
      o.id,
      `"${date}"`,
      `"${o.customerName}"`,
      o.customerPhone,
      o.type,
      o.status,
      o.subtotal,
      o.deliveryFee,
      o.tip,
      o.total,
    ].join(',')
  }).join('\r\n')

  const csv = header + rows
  const filename = `tastytime-orders-${from.toISOString().split('T')[0]}-to-${to.toISOString().split('T')[0]}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})

// GET /reports/customers — customer report
reportsRouter.get('/customers', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)

  const users = await db
    .select({
      id: tables.users.id,
      name: tables.users.name,
      email: tables.users.email,
      loyaltyPoints: tables.users.loyaltyPoints,
      createdAt: tables.users.createdAt,
    })
    .from(tables.users)
    .where(eq(tables.users.role, 'customer'))
    .orderBy(desc(tables.users.loyaltyPoints))
    .limit(100)

  return c.json({ success: true, data: users })
})

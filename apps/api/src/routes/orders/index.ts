import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { checkoutSchema, updateOrderStatusSchema } from '@tastytime/validators'
import { createTenantDb, createTenantSchema } from '@tastytime/db'
import { eq, desc } from 'drizzle-orm'
import { createLogger } from '@tastytime/logger'
import { notificationQueue, orderConfirmationHtml, orderStatusHtml } from '../../workers/notification.worker'
import { getTenantSubscriptions } from '../push'
import { emitNewOrder, emitOrderStatusChanged } from '../../realtime'
import type { TenantRecord } from '@tastytime/db'

const log = createLogger({ module: 'orders-route' })

export const ordersRouter = new Hono()

// POST /orders — create order (guest or authenticated)
ordersRouter.post('/', zValidator('json', checkoutSchema), async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const user = c.get('user') as { id: string } | undefined
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const body = c.req.valid('json')

  // Validate order type requirements
  if (body.type === 'delivery' && !body.address) {
    return c.json({ success: false, error: 'Address required for delivery' }, 422)
  }

  // Calculate pricing (trusted from validated product prices in DB)
  let subtotal = 0
  const resolvedItems = []

  for (const item of body.items) {
    const [product] = await db
      .select()
      .from(tables.products)
      .where(eq(tables.products.id, item.productId))
      .limit(1)

    if (!product || !product.isAvailable) {
      return c.json({ success: false, error: `Product ${item.productId} not available` }, 422)
    }

    const optionsDelta = item.selectedOptions.reduce((sum, o) => sum + o.priceDelta, 0)
    const unitPrice = Number(product.basePrice) + optionsDelta
    const totalPrice = unitPrice * item.quantity
    subtotal += totalPrice

    resolvedItems.push({
      productId: item.productId,
      productName: product.nameFr,
      quantity: item.quantity,
      unitPrice,
      customizations: item.selectedOptions,
    })
  }

  // Promo code validation
  let promoDiscount = 0
  let promoCodeId: string | null = null
  if (body.promoCode) {
    const [promo] = await db
      .select()
      .from(tables.promoCodes)
      .where(eq(tables.promoCodes.code, body.promoCode.toUpperCase()))
      .limit(1)

    if (promo && promo.isActive && (!promo.validUntil || new Date(promo.validUntil) > new Date())) {
      if (!promo.maxUses || promo.usedCount < promo.maxUses) {
        if (!promo.minOrderAmount || subtotal >= Number(promo.minOrderAmount)) {
          promoCodeId = promo.id
          if (promo.type === 'percentage') promoDiscount = (subtotal * Number(promo.value)) / 100
          else if (promo.type === 'fixed') promoDiscount = Math.min(Number(promo.value), subtotal)
          await db
            .update(tables.promoCodes)
            .set({ usedCount: promo.usedCount + 1 })
            .where(eq(tables.promoCodes.id, promo.id))
        }
      }
    }
  }

  const deliveryFee = body.type === 'delivery' ? 15 : 0
  const tax = 0
  const total = subtotal - promoDiscount + deliveryFee + body.tip + tax

  const [order] = await db
    .insert(tables.orders)
    .values({
      customerId: user?.id ?? null,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      type: body.type,
      status: 'received',
      items: resolvedItems,
      subtotal: subtotal.toString(),
      deliveryFee: deliveryFee.toString(),
      tip: body.tip.toString(),
      tax: tax.toString(),
      total: total.toString(),
      promoCodeId,
      promoDiscount: promoDiscount.toString(),
      address: body.address ?? null,
      tableNumber: body.tableNumber ?? null,
      scheduledAt: body.scheduledAt ?? null,
      notes: body.notes ?? null,
      estimatedPrepMinutes: 20,
    })
    .returning()

  if (!order) {
    return c.json({ success: false, error: 'Failed to create order' }, 500)
  }

  log.info({ orderId: order.id, tenantId: tenant.id, total }, 'New order created')

  // Real-time: notify kitchen + dashboard
  emitNewOrder(order, tenant.id)

  // Queue notifications — email + push to all tenant subscribers
  await notificationQueue.addBulk([
    {
      name: 'order_confirmation_email',
      data: {
        channel: 'email' as const,
        to: body.customerPhone.includes('@') ? body.customerPhone : `${body.customerPhone}@sms.tastytime.ma`,
        subject: `Commande #${order.id.slice(0, 8).toUpperCase()} reçue — Tasty Time`,
        html: orderConfirmationHtml({
          customerName: body.customerName,
          orderId: order.id,
          items: resolvedItems as Array<{ productName: string; quantity: number; unitPrice: number }>,
          total,
          type: body.type,
        }),
      },
    },
    ...getTenantSubscriptions(tenant.id).map((sub) => ({
      name: 'order_push',
      data: {
        channel: 'push' as const,
        subscription: sub,
        title: 'Nouvelle commande ! 🛎️',
        body: `#${order.id.slice(0, 8).toUpperCase()} — ${body.customerName} — ${total.toFixed(0)} MAD`,
        url: `/orders/${order.id}`,
      },
    })),
  ])

  return c.json({ success: true, data: order }, 201)
})

// GET /orders/:id — track order
ordersRouter.get('/:id', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const id = c.req.param('id')

  const [order] = await db
    .select()
    .from(tables.orders)
    .where(eq(tables.orders.id, id))
    .limit(1)

  if (!order) return c.json({ success: false, error: 'Order not found' }, 404)

  return c.json({ success: true, data: order })
})

// PATCH /orders/:id/status — staff updates order status
ordersRouter.patch('/:id/status', zValidator('json', updateOrderStatusSchema), async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const id = c.req.param('id')
  const { status } = c.req.valid('json')

  const [updated] = await db
    .update(tables.orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(tables.orders.id, id))
    .returning()

  if (!updated) return c.json({ success: false, error: 'Order not found' }, 404)

  log.info({ orderId: id, status }, 'Order status updated')
  emitOrderStatusChanged(id, status, tenant.id)

  // Queue customer status notification via email
  const statusesToNotify = ['accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']
  if (statusesToNotify.includes(status)) {
    await notificationQueue.add('order_status_email', {
      channel: 'email' as const,
      to: updated.customerPhone.includes('@') ? updated.customerPhone : `${updated.customerPhone}@sms.tastytime.ma`,
      subject: `Commande #${id.slice(0, 8).toUpperCase()} — mise à jour`,
      html: orderStatusHtml({ customerName: updated.customerName, orderId: id, status }),
    })
  }

  return c.json({ success: true, data: updated })
})

// GET /orders — list orders (staff)
ordersRouter.get('/', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const status = c.req.query('status')

  const rows = await db
    .select()
    .from(tables.orders)
    .where(status ? eq(tables.orders.status, status) : undefined)
    .orderBy(desc(tables.orders.createdAt))
    .limit(100)

  return c.json({ success: true, data: rows })
})

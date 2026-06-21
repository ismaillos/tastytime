import { Hono } from 'hono'
import { createLogger } from '@tastytime/logger'
import type { TenantRecord } from '@tastytime/db'

const log = createLogger({ module: 'push-route' })

export const pushRouter = new Hono()

// In-memory subscription store per tenant (production: store in DB)
const subscriptions = new Map<string, Set<object>>()

// POST /push/subscribe — save push subscription
pushRouter.post('/subscribe', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const body = await c.req.json<{ subscription: object; userId?: string }>()

  if (!body.subscription) return c.json({ success: false, error: 'subscription required' }, 400)

  if (!subscriptions.has(tenant.id)) subscriptions.set(tenant.id, new Set())
  subscriptions.get(tenant.id)!.add(body.subscription)

  log.info({ tenantId: tenant.id }, 'Push subscription saved')
  return c.json({ success: true })
})

// GET /push/vapid-public-key — expose public VAPID key to clients
pushRouter.get('/vapid-public-key', (c) => {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) return c.json({ success: false, error: 'VAPID not configured' }, 503)
  return c.json({ success: true, data: { publicKey: key } })
})

// Export so notification worker can read subscriptions for a tenant
export function getTenantSubscriptions(tenantId: string): object[] {
  return Array.from(subscriptions.get(tenantId) ?? [])
}

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { updateDriverLocationSchema } from '@tastytime/validators'
import { createTenantDb, createTenantSchema } from '@tastytime/db'
import { eq } from 'drizzle-orm'
import { createLogger } from '@tastytime/logger'
import { getIO } from '../../realtime'
import type { TenantRecord } from '@tastytime/db'

const log = createLogger({ module: 'driver-route' })

export const driverRouter = new Hono()

// PATCH /driver/status — toggle online/offline
driverRouter.patch('/status', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const user = c.get('user') as { id: string }
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const { isOnline } = await c.req.json<{ isOnline: boolean }>()

  const [driver] = await db
    .update(tables.drivers)
    .set({ isOnline, updatedAt: new Date() })
    .where(eq(tables.drivers.userId, user.id))
    .returning()

  if (!driver) return c.json({ success: false, error: 'Driver not found' }, 404)

  log.info({ userId: user.id, isOnline }, 'Driver status updated')
  return c.json({ success: true, data: driver })
})

// PATCH /driver/location — update GPS coordinates
driverRouter.patch('/location', zValidator('json', updateDriverLocationSchema), async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const user = c.get('user') as { id: string }
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const { lat, lng } = c.req.valid('json')

  await db
    .update(tables.drivers)
    .set({ currentLat: lat.toString(), currentLng: lng.toString(), updatedAt: new Date() })
    .where(eq(tables.drivers.userId, user.id))

  // Broadcast to dashboard
  const [driver] = await db
    .select()
    .from(tables.drivers)
    .where(eq(tables.drivers.userId, user.id))
    .limit(1)

  if (driver?.assignedOrderId) {
    getIO()
      .to(`order:${driver.assignedOrderId}`)
      .emit('driver:location', { driverId: driver.id, lat, lng })
  }

  return c.json({ success: true })
})

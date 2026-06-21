import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { inviteStaffSchema } from '@tastytime/validators'
import { createTenantDb, createTenantSchema } from '@tastytime/db'
import { eq, ne } from 'drizzle-orm'
import { createLogger } from '@tastytime/logger'
import { notificationQueue } from '../../workers/notification.worker'
import type { TenantRecord } from '@tastytime/db'

const log = createLogger({ module: 'staff-route' })

export const staffRouter = new Hono()

// GET /staff — list all staff members
staffRouter.get('/', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)

  const members = await db
    .select({
      id: tables.users.id,
      name: tables.users.name,
      email: tables.users.email,
      role: tables.users.role,
      createdAt: tables.users.createdAt,
    })
    .from(tables.users)
    .where(ne(tables.users.role, 'customer'))

  return c.json({ success: true, data: members })
})

// POST /staff/invite — invite a staff member by email
staffRouter.post('/invite', zValidator('json', inviteStaffSchema), async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const { email, role } = c.req.valid('json')

  // Check if user already exists
  const [existing] = await db
    .select()
    .from(tables.users)
    .where(eq(tables.users.email, email))
    .limit(1)

  if (existing) {
    // Update role if user already exists
    await db
      .update(tables.users)
      .set({ role, updatedAt: new Date() })
      .where(eq(tables.users.id, existing.id))
    log.info({ email, role }, 'Staff role updated')
    return c.json({ success: true, data: { action: 'updated', email, role } })
  }

  // Queue invitation email
  const inviteUrl = `${process.env.DASHBOARD_URL ?? 'http://localhost:3001'}/auth/accept-invite?email=${encodeURIComponent(email)}&tenant=${tenant.slug}&role=${role}`

  await notificationQueue.add('staff_invite', {
    channel: 'email' as const,
    to: email,
    subject: `Invitation — Tasty Time Dashboard (${role})`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <div style="background:#facc15;padding:24px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="margin:0;color:#000">Tasty Time</h1>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px">
          <h2>Vous avez été invité(e) !</h2>
          <p>Vous avez été invité(e) à rejoindre le tableau de bord Tasty Time en tant que <strong>${role}</strong>.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#facc15;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
            Accepter l'invitation
          </a>
          <p style="color:#666;font-size:13px">Ce lien est valable 48 heures.</p>
        </div>
      </div>
    `,
  })

  log.info({ email, role, tenantId: tenant.id }, 'Staff invitation sent')
  return c.json({ success: true, data: { action: 'invited', email, role } })
})

// PATCH /staff/:id/role — update staff member role
staffRouter.patch('/:id/role', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const id = c.req.param('id')
  const { role } = await c.req.json<{ role: string }>()

  const validRoles = ['admin', 'kitchen', 'cashier', 'driver']
  if (!validRoles.includes(role)) {
    return c.json({ success: false, error: 'Invalid role' }, 400)
  }

  const [updated] = await db
    .update(tables.users)
    .set({ role, updatedAt: new Date() })
    .where(eq(tables.users.id, id))
    .returning()

  if (!updated) return c.json({ success: false, error: 'User not found' }, 404)

  log.info({ userId: id, role }, 'Staff role updated')
  return c.json({ success: true, data: updated })
})

// DELETE /staff/:id — remove staff member (revoke access by setting to customer)
staffRouter.delete('/:id', async (c) => {
  const tenant = c.get('tenant') as TenantRecord
  const tables = createTenantSchema(tenant.schema)
  const db = createTenantDb(tenant.schema)
  const id = c.req.param('id')

  await db
    .update(tables.users)
    .set({ role: 'customer', updatedAt: new Date() })
    .where(eq(tables.users.id, id))

  log.info({ userId: id }, 'Staff access revoked')
  return c.json({ success: true })
})

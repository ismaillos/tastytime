import type { Context, Next } from 'hono'
import { publicDb } from '@tastytime/db'
import { tenants } from '@tastytime/db'
import { eq } from 'drizzle-orm'
import { createLogger } from '@tastytime/logger'

const log = createLogger({ module: 'tenant-middleware' })

// Resolves tenant from X-Tenant-Slug header or subdomain.
// Attaches tenant record to context.
export async function tenantMiddleware(c: Context, next: Next) {
  const slug =
    c.req.header('X-Tenant-Slug') ??
    extractSubdomain(c.req.header('host') ?? '')

  if (!slug) {
    return c.json({ success: false, error: 'Tenant not identified' }, 400)
  }

  const [tenant] = await publicDb
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1)

  if (!tenant || !tenant.isActive) {
    log.warn({ slug }, 'Unknown or inactive tenant')
    return c.json({ success: false, error: 'Tenant not found' }, 404)
  }

  c.set('tenant', tenant)
  log.debug({ tenantId: tenant.id }, 'Tenant resolved')
  await next()
}

function extractSubdomain(host: string): string | null {
  const parts = host.split('.')
  if (parts.length >= 3) return parts[0] ?? null
  return null
}

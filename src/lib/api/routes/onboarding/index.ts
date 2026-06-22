import { Hono } from 'hono'
import { createRouter, type HonoEnv } from '@/lib/api/types'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { publicDb, tenants } from '@tastytime/db'
import { eq } from 'drizzle-orm'
import { createTenantDb, createTenantSchema } from '@tastytime/db'
import { createLogger } from '@tastytime/logger'
import { nanoid } from 'nanoid'

const log = createLogger({ module: 'onboarding' })

export const onboardingRouter = createRouter()

const createTenantSchema_v = z.object({
  slug: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  name: z.string().min(2).max(100),
  address: z.string().optional(),
  phone: z.string().optional(),
  currency: z.enum(['MAD', 'EUR', 'USD']).default('MAD'),
  defaultLocale: z.enum(['fr', 'en', 'ar']).default('fr'),
  adminEmail: z.string().email(),
  adminName: z.string().min(2),
  adminPassword: z.string().min(8),
})

// POST /onboarding/tenant — create a new tenant + admin user + schema
onboardingRouter.post('/tenant', zValidator('json', createTenantSchema_v), async (c) => {
  const body = c.req.valid('json')

  // Check slug uniqueness
  const [existing] = await publicDb
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, body.slug))
    .limit(1)

  if (existing) {
    return c.json({ success: false, error: 'Slug already taken' }, 409)
  }

  const tenantId = nanoid()
  const schemaName = `tenant_${body.slug.replace(/-/g, '_')}`

  // Insert tenant record
  await publicDb.insert(tenants).values({
    id: tenantId,
    slug: body.slug,
    name: body.name,
    schema: schemaName,
    currency: body.currency,
    defaultLocale: body.defaultLocale,
    address: body.address ?? null,
    phone: body.phone ?? null,
    isActive: true,
  })

  // Provision the tenant PostgreSQL schema + tables
  const db = createTenantDb(schemaName)

  // We use raw SQL via the underlying postgres client to create the schema
  // Drizzle doesn't expose the raw client easily from createTenantDb, so we
  // use the publicDb connection to run the schema creation DDL.
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)

    // Create all tenant tables (replicated from seed.ts DDL pattern)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'customer',
        avatar_url TEXT,
        loyalty_points INTEGER NOT NULL DEFAULT 0,
        birthday TEXT,
        referred_by TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "${schemaName}".categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT NOT NULL UNIQUE,
        name_fr TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        image_url TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "${schemaName}".products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID NOT NULL REFERENCES "${schemaName}".categories(id),
        name_fr TEXT NOT NULL, name_en TEXT NOT NULL, name_ar TEXT NOT NULL,
        description_fr TEXT NOT NULL DEFAULT '',
        description_en TEXT NOT NULL DEFAULT '',
        description_ar TEXT NOT NULL DEFAULT '',
        ingredients_fr TEXT NOT NULL DEFAULT '',
        ingredients_en TEXT NOT NULL DEFAULT '',
        ingredients_ar TEXT NOT NULL DEFAULT '',
        allergens JSONB NOT NULL DEFAULT '[]',
        images JSONB NOT NULL DEFAULT '[]',
        base_price NUMERIC(10,2) NOT NULL,
        calories INTEGER,
        prep_time_minutes INTEGER NOT NULL DEFAULT 15,
        is_available BOOLEAN NOT NULL DEFAULT true,
        is_featured BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "${schemaName}".option_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES "${schemaName}".products(id) ON DELETE CASCADE,
        name_fr TEXT NOT NULL, name_en TEXT NOT NULL, name_ar TEXT NOT NULL,
        is_required BOOLEAN NOT NULL DEFAULT false,
        min_selections INTEGER NOT NULL DEFAULT 0,
        max_selections INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS "${schemaName}".options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES "${schemaName}".option_groups(id) ON DELETE CASCADE,
        name_fr TEXT NOT NULL, name_en TEXT NOT NULL, name_ar TEXT NOT NULL,
        price_delta NUMERIC(10,2) NOT NULL DEFAULT 0,
        is_available BOOLEAN NOT NULL DEFAULT true
      );
      CREATE TABLE IF NOT EXISTS "${schemaName}".promo_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        value NUMERIC(10,2) NOT NULL,
        min_order_amount NUMERIC(10,2),
        max_uses INTEGER,
        used_count INTEGER NOT NULL DEFAULT 0,
        valid_until TIMESTAMPTZ,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "${schemaName}".orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id TEXT REFERENCES "${schemaName}".users(id),
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'received',
        items JSONB NOT NULL DEFAULT '[]',
        subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
        delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
        tip NUMERIC(10,2) NOT NULL DEFAULT 0,
        tax NUMERIC(10,2) NOT NULL DEFAULT 0,
        total NUMERIC(10,2) NOT NULL DEFAULT 0,
        promo_code_id UUID REFERENCES "${schemaName}".promo_codes(id),
        promo_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
        address TEXT,
        delivery_address TEXT,
        table_number TEXT,
        scheduled_at TIMESTAMPTZ,
        notes TEXT,
        estimated_prep_minutes INTEGER NOT NULL DEFAULT 20,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "${schemaName}".loyalty_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES "${schemaName}".users(id),
        order_id UUID REFERENCES "${schemaName}".orders(id),
        type TEXT NOT NULL,
        points INTEGER NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "${schemaName}".inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES "${schemaName}".products(id),
        quantity INTEGER NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'unit',
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "${schemaName}".drivers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL UNIQUE REFERENCES "${schemaName}".users(id),
        is_online BOOLEAN NOT NULL DEFAULT false,
        current_lat NUMERIC(10,7),
        current_lng NUMERIC(10,7),
        assigned_order_id UUID REFERENCES "${schemaName}".orders(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    // Create admin user (hashed password via Better Auth would be done at auth layer;
    // here we store a placeholder so the record exists)
    const adminId = nanoid()
    await pool.query(
      `INSERT INTO "${schemaName}".users (id, email, name, role) VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [adminId, body.adminEmail, body.adminName],
    )

    log.info({ tenantId, slug: body.slug, schemaName }, 'Tenant provisioned successfully')
  } finally {
    await pool.end()
  }

  return c.json({
    success: true,
    data: {
      tenantId,
      slug: body.slug,
      name: body.name,
      schema: schemaName,
      dashboardUrl: `http://${body.slug}.tastytime.ma/dashboard`,
      apiHeader: `X-Tenant-Slug: ${body.slug}`,
    },
  }, 201)
})

// GET /onboarding/check-slug/:slug — check slug availability
onboardingRouter.get('/check-slug/:slug', async (c) => {
  const slug = c.req.param('slug').toLowerCase()
  const [existing] = await publicDb
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1)
  return c.json({ success: true, data: { available: !existing } })
})

// GET /onboarding/tenants — list all tenants (super-admin)
onboardingRouter.get('/tenants', async (c) => {
  const all = await publicDb.select().from(tenants)
  return c.json({ success: true, data: all })
})

// PATCH /onboarding/tenants/:id — update tenant settings
onboardingRouter.patch('/tenants/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Partial<{
    name: string
    address: string
    phone: string
    logoUrl: string
    currency: string
    defaultLocale: string
    isActive: boolean
  }>>()

  const [updated] = await publicDb
    .update(tenants)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning()

  if (!updated) return c.json({ success: false, error: 'Tenant not found' }, 404)

  log.info({ tenantId: id }, 'Tenant settings updated')
  return c.json({ success: true, data: updated })
})

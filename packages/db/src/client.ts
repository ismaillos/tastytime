import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as publicSchema from './schema/public'
import { createTenantSchema } from './schema/tenant'

const connectionString = process.env.DATABASE_URL!

// Singleton connection for the public schema
const publicSql = postgres(connectionString, { max: 5 })
export const publicDb = drizzle(publicSql, { schema: publicSchema })

// Returns a Drizzle instance scoped to a tenant's PostgreSQL schema
export function createTenantDb(tenantSchema: string) {
  const sql = postgres(connectionString, {
    max: 10,
    onnotice: () => {},
  })
  const tables = createTenantSchema(tenantSchema)
  return drizzle(sql, { schema: tables })
}

export type PublicDb = typeof publicDb
export type TenantDb = ReturnType<typeof createTenantDb>

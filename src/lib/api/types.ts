import type { TenantRecord } from '@tastytime/db'
import { Hono } from 'hono'

export type HonoEnv = {
  Variables: {
    tenant: TenantRecord
    user: { id: string; role: string } | undefined
  }
}

export function createRouter() {
  return new Hono<HonoEnv>()
}

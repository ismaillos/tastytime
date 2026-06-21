import type { Context, Next } from 'hono'
import type { UserRole } from '@tastytime/types'
import { createLogger } from '@tastytime/logger'

const log = createLogger({ module: 'auth-middleware' })

export async function requireAuth(c: Context, next: Next) {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }
  await next()
}

export function requireRole(...roles: UserRole[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role as UserRole)) {
      log.warn({ userId: user?.id, required: roles }, 'Insufficient role')
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }
    await next()
  }
}

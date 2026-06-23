import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import { tenantMiddleware } from '@/lib/api/middleware/tenant'
import { menuRouter } from '@/lib/api/routes/menu'
import { menuAdminRouter } from '@/lib/api/routes/menu/admin'
import { ordersRouter } from '@/lib/api/routes/orders'
import { dashboardRouter } from '@/lib/api/routes/dashboard'
import { driverRouter } from '@/lib/api/routes/driver'
import { loyaltyRouter } from '@/lib/api/routes/loyalty'
import { marketingRouter } from '@/lib/api/routes/marketing'
import { reportsRouter } from '@/lib/api/routes/reports'
import { pushRouter } from '@/lib/api/routes/push'
import { staffRouter } from '@/lib/api/routes/staff'
import { onboardingRouter } from '@/lib/api/routes/onboarding'
import { createLogger } from '@tastytime/logger'

export const runtime = 'nodejs'

const log = createLogger({ module: 'api' })

const app = new Hono().basePath('/api')

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return origin
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') ?? []
    if (allowed.includes(origin)) return origin
    if (origin.includes('localhost') || origin.endsWith('.vercel.app')) return origin
    return null
  },
  credentials: true,
}))
app.use('*', prettyJSON())
app.use('/*', tenantMiddleware)

app.route('/menu', menuRouter)
app.route('/admin/menu', menuAdminRouter)
app.route('/orders', ordersRouter)
app.route('/dashboard', dashboardRouter)
app.route('/driver', driverRouter)
app.route('/loyalty', loyaltyRouter)
app.route('/marketing', marketingRouter)
app.route('/reports', reportsRouter)
app.route('/push', pushRouter)
app.route('/staff', staffRouter)
app.route('/onboarding', onboardingRouter)

app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

app.onError((err, c) => {
  log.error({ err: err.message, path: c.req.path }, 'Unhandled error')
  return c.json({ success: false, error: 'Internal server error' }, 500)
})

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)

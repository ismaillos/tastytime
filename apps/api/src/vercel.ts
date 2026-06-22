import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import { tenantMiddleware } from './middleware/tenant'
import { menuRouter } from './routes/menu'
import { menuAdminRouter } from './routes/menu/admin'
import { ordersRouter } from './routes/orders'
import { dashboardRouter } from './routes/dashboard'
import { driverRouter } from './routes/driver'
import { loyaltyRouter } from './routes/loyalty'
import { marketingRouter } from './routes/marketing'
import { reportsRouter } from './routes/reports'
import { pushRouter } from './routes/push'
import { staffRouter } from './routes/staff'
import { onboardingRouter } from './routes/onboarding'
import { createLogger } from '@tastytime/logger'

export const config = { runtime: 'nodejs' }

const log = createLogger({ module: 'api' })

const app = new Hono().basePath('/api')

app.use('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000', 'http://localhost:3001'],
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

// Health check accessible at /api/health or via rewrite at /health
app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

app.onError((err, c) => {
  log.error({ err: err.message, path: c.req.path }, 'Unhandled error')
  return c.json({ success: false, error: 'Internal server error' }, 500)
})

export default handle(app)

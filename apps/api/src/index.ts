import { createServer } from 'http'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { createLogger } from '@tastytime/logger'
import { tenantMiddleware } from './middleware/tenant'
import { menuRouter } from './routes/menu'
import { menuAdminRouter } from './routes/menu/admin'
import { ordersRouter } from './routes/orders'
import { dashboardRouter } from './routes/dashboard'
import { driverRouter } from './routes/driver'
import { loyaltyRouter } from './routes/loyalty'
import { marketingRouter } from './routes/marketing'
import { reportsRouter } from './routes/reports'
import { initSocketIO } from './realtime'
import { startNotificationWorker } from './workers/notification.worker'

const log = createLogger({ module: 'api' })

const app = new Hono()

app.use('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}))
app.use('*', prettyJSON())

// Tenant resolution — all API routes are tenant-scoped
app.use('/api/*', tenantMiddleware)

// Routes
app.route('/api/menu', menuRouter)
app.route('/api/admin/menu', menuAdminRouter)
app.route('/api/orders', ordersRouter)
app.route('/api/dashboard', dashboardRouter)
app.route('/api/driver', driverRouter)
app.route('/api/loyalty', loyaltyRouter)
app.route('/api/marketing', marketingRouter)
app.route('/api/reports', reportsRouter)

// Health check — not tenant-scoped
app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

app.onError((err, c) => {
  log.error({ err: err.message, path: c.req.path }, 'Unhandled error')
  return c.json({ success: false, error: 'Internal server error' }, 500)
})

const PORT = Number(process.env.PORT ?? 4000)

const server = createServer()

// Attach Socket.IO to the HTTP server
initSocketIO(server)

// Attach Hono to the same HTTP server
serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, () => {
  log.info({ port: PORT }, '🚀 Tasty Time API running')
})

// Start BullMQ workers
startNotificationWorker()
log.info('📬 Notification worker started')

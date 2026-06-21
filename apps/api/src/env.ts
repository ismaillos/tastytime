import { z } from 'zod'
import { createLogger } from '@tastytime/logger'

const log = createLogger({ module: 'env' })

const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().optional(),
  // Optional — skip if not configured
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  DASHBOARD_URL: z.string().optional(),
})

export type Env = z.infer<typeof schema>

export function validateEnv(): Env {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    log.error({ missing }, 'Invalid environment configuration')
    console.error('\n❌ Missing or invalid environment variables:\n' + missing.map((m) => `  • ${m}`).join('\n') + '\n')
    process.exit(1)
  }

  const optional = ['RESEND_API_KEY', 'VAPID_PUBLIC_KEY', 'TWILIO_ACCOUNT_SID', 'WHATSAPP_TOKEN'] as const
  const missing_optional = optional.filter((k) => !result.data[k])
  if (missing_optional.length > 0) {
    log.warn({ missing_optional }, 'Some notification channels are disabled (env vars not set)')
  }

  return result.data
}

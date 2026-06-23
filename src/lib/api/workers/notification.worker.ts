import { Worker, Queue, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import { createLogger } from '@tastytime/logger'

const log = createLogger({ module: 'notification-worker' })

// Lazy connection — only created when Redis is available (self-hosted / BullMQ worker mode)
let _connection: IORedis | null = null
function getConnection() {
  if (!_connection) {
    _connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
  }
  return _connection
}

let _notificationQueue: Queue | null = null
let _dlq: Queue | null = null

export function getNotificationQueue() {
  if (!_notificationQueue) {
    _notificationQueue = new Queue('notifications', {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 500 },
        removeOnFail: false,
      },
    })
  }
  return _notificationQueue
}

export function getDlq() {
  if (!_dlq) {
    _dlq = new Queue('notifications:dlq', { connection: getConnection() })
  }
  return _dlq
}

// Backwards-compat export used by routes (lazy, won't connect until first use)
export const notificationQueue = {
  add: (...args: Parameters<Queue['add']>) => getNotificationQueue().add(...args),
  addBulk: (...args: Parameters<Queue['addBulk']>) => getNotificationQueue().addBulk(...args),
  getJob: (...args: Parameters<Queue['getJob']>) => getNotificationQueue().getJob(...args),
} as unknown as Queue

export type NotificationJob =
  | { channel: 'email'; to: string; subject: string; html: string }
  | { channel: 'push'; subscription: object; title: string; body: string; url?: string }
  | { channel: 'whatsapp'; to: string; template: string; params: string[] }
  | { channel: 'sms'; to: string; body: string }

// Helpers for typed email templates
export function orderConfirmationHtml(opts: {
  customerName: string
  orderId: string
  items: Array<{ productName: string; quantity: number; unitPrice: number }>
  total: number
  type: string
}) {
  const rows = opts.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.quantity}× ${i.productName}</td><td style="text-align:right">${(i.quantity * i.unitPrice).toFixed(0)} MAD</td></tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Confirmation de commande</title></head>
<body style="font-family:sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#facc15;padding:24px;text-align:center">
      <h1 style="margin:0;color:#000;font-size:24px">Tasty Time</h1>
      <p style="margin:4px 0 0;color:#333;font-size:14px">Casablanca, Maroc</p>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 8px;color:#111">Merci, ${opts.customerName} !</h2>
      <p style="color:#555;margin:0 0 20px">Votre commande <strong>#${opts.orderId.slice(0, 8).toUpperCase()}</strong> a bien été reçue.</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee">
        ${rows}
        <tr style="border-top:2px solid #facc15">
          <td style="padding:10px 0;font-weight:bold">Total</td>
          <td style="text-align:right;font-weight:bold;color:#facc15">${opts.total.toFixed(0)} MAD</td>
        </tr>
      </table>
      <p style="color:#555;font-size:13px;margin-top:20px">Mode: ${opts.type === 'delivery' ? '🛵 Livraison' : opts.type === 'pickup' ? '🏃 À emporter' : '🪑 Sur place'}</p>
      <p style="color:#888;font-size:12px;margin-top:24px">Vous pouvez suivre votre commande en temps réel sur notre site.</p>
    </div>
  </div>
</body>
</html>`
}

export function orderStatusHtml(opts: {
  customerName: string
  orderId: string
  status: string
}) {
  const labels: Record<string, { label: string; emoji: string; color: string }> = {
    accepted:        { label: 'Acceptée',         emoji: '✅', color: '#22c55e' },
    preparing:       { label: 'En préparation',   emoji: '👨‍🍳', color: '#f59e0b' },
    ready:           { label: 'Prête',             emoji: '🛎️', color: '#3b82f6' },
    out_for_delivery:{ label: 'En livraison',      emoji: '🛵', color: '#8b5cf6' },
    delivered:       { label: 'Livrée',            emoji: '🎉', color: '#22c55e' },
    cancelled:       { label: 'Annulée',           emoji: '❌', color: '#ef4444' },
  }
  const info = labels[opts.status] ?? { label: opts.status, emoji: '📦', color: '#6b7280' }

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Mise à jour commande</title></head>
<body style="font-family:sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#facc15;padding:24px;text-align:center">
      <h1 style="margin:0;color:#000;font-size:24px">Tasty Time</h1>
    </div>
    <div style="padding:24px;text-align:center">
      <div style="font-size:48px;margin-bottom:12px">${info.emoji}</div>
      <h2 style="color:${info.color};margin:0 0 8px">${info.label}</h2>
      <p style="color:#555">Bonjour ${opts.customerName}, votre commande <strong>#${opts.orderId.slice(0, 8).toUpperCase()}</strong> est maintenant : <strong>${info.label}</strong></p>
    </div>
  </div>
</body>
</html>`
}

export function startNotificationWorker() {
  const worker = new Worker<NotificationJob>(
    getNotificationQueue().name,
    async (job) => {
      const data = job.data
      log.info({ channel: data.channel, jobId: job.id, attempt: job.attemptsMade + 1 }, 'Processing notification')

      if (data.channel === 'email') {
        if (!process.env.RESEND_API_KEY) {
          log.warn('RESEND_API_KEY not set, skipping email')
          return
        }
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { error } = await resend.emails.send({
          from: process.env.EMAIL_FROM ?? 'Tasty Time <no-reply@tastytime.ma>',
          to: data.to,
          subject: data.subject,
          html: data.html,
        })
        if (error) throw new Error(`Resend error: ${error.message}`)
      }

      else if (data.channel === 'push') {
        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
          log.warn('VAPID keys not set, skipping push')
          return
        }
        const webpush = await import('web-push')
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT ?? 'mailto:hello@tastytime.ma',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY,
        )
        await webpush.sendNotification(
          data.subscription as Parameters<typeof webpush.sendNotification>[0],
          JSON.stringify({ title: data.title, body: data.body, url: data.url }),
        )
      }

      else if (data.channel === 'sms') {
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
          log.warn('Twilio credentials not set, skipping SMS')
          return
        }
        const twilio = (await import('twilio')).default
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        await client.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: data.to,
          body: data.body,
        })
      }

      else if (data.channel === 'whatsapp') {
        if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
          log.warn('WhatsApp credentials not set, skipping')
          return
        }
        const response = await fetch(
          `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: data.to.replace(/\D/g, ''), // Strip non-digits for WA format
              type: 'template',
              template: {
                name: data.template,
                language: { code: 'fr' },
                components: [
                  {
                    type: 'body',
                    parameters: data.params.map((text) => ({ type: 'text', text })),
                  },
                ],
              },
            }),
          },
        )
        if (!response.ok) {
          const err = await response.text()
          throw new Error(`WhatsApp API error: ${err}`)
        }
      }

      log.info({ channel: data.channel, jobId: job.id }, 'Notification sent')
    },
    {
      connection: getConnection(),
      concurrency: 10,
      limiter: { max: 50, duration: 1000 }, // Rate limit: 50 jobs/sec
    },
  )

  // Move permanently failed jobs to DLQ
  const events = new QueueEvents('notifications', { connection: getConnection() })
  events.on('failed', async ({ jobId, failedReason }) => {
    log.error({ jobId, failedReason }, 'Notification job failed after all retries')
    try {
      const job = await notificationQueue.getJob(jobId)
      if (job && job.attemptsMade >= (job.opts.attempts ?? 5)) {
        await getDlq().add('dlq', job.data, { jobId: `dlq:${jobId}` })
        log.warn({ jobId }, 'Job moved to DLQ')
      }
    } catch {
      // best-effort DLQ move
    }
  })

  worker.on('error', (err) => {
    log.error({ err: err.message }, 'Worker error')
  })

  log.info('Notification worker started (concurrency=10, retry=5, backoff=exponential)')
  return worker
}

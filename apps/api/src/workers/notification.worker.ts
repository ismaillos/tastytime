import { Worker, Queue } from 'bullmq'
import IORedis from 'ioredis'
import { createLogger } from '@tastytime/logger'

const log = createLogger({ module: 'notification-worker' })

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

export const notificationQueue = new Queue('notifications', { connection })

export type NotificationJob =
  | { channel: 'email'; to: string; subject: string; html: string }
  | { channel: 'push'; subscription: object; title: string; body: string }
  | { channel: 'whatsapp'; to: string; template: string; params: string[] }
  | { channel: 'sms'; to: string; body: string }

export function startNotificationWorker() {
  const worker = new Worker<NotificationJob>(
    'notifications',
    async (job) => {
      const data = job.data
      log.info({ channel: data.channel, jobId: job.id }, 'Processing notification')

      if (data.channel === 'email') {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? 'no-reply@tastytime.ma',
          to: data.to,
          subject: data.subject,
          html: data.html,
        })
      }

      if (data.channel === 'push') {
        const webpush = await import('web-push')
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT!,
          process.env.VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!,
        )
        await webpush.sendNotification(
          data.subscription as Parameters<typeof webpush.sendNotification>[0],
          JSON.stringify({ title: data.title, body: data.body }),
        )
      }

      if (data.channel === 'sms') {
        const twilio = (await import('twilio')).default
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        await client.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: data.to,
          body: data.body,
        })
      }

      // WhatsApp via Meta Cloud API
      if (data.channel === 'whatsapp') {
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
              to: data.to,
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
          log.error({ err }, 'WhatsApp send failed')
          throw new Error(`WhatsApp API error: ${err}`)
        }
      }

      log.info({ channel: data.channel, jobId: job.id }, 'Notification sent')
    },
    { connection, concurrency: 10 },
  )

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err: err.message }, 'Notification job failed')
  })

  return worker
}

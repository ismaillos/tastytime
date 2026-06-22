# Vercel Deployment Guide — Tasty Time

## Overview

Create **4 separate Vercel projects**, one per app. Each project uses the same GitHub repo but a different Root Directory.

| Project | Root Directory | Framework |
|---|---|---|
| `tastytime-api` | `apps/api` | Other |
| `tastytime-web` | `apps/web` | Next.js |
| `tastytime-dashboard` | `apps/dashboard` | Next.js |
| `tastytime-driver` | `apps/driver` | Next.js |

> Enable **"Include files outside the root directory"** for all 4 projects (required for monorepo workspace installs).

---

## tastytime-api Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/tastytime` |
| `REDIS_URL` | ✅ | `redis://...` (use Upstash for serverless) |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated: `https://tastytime.ma,https://dashboard.tastytime.ma` |
| `RESEND_API_KEY` | ⚠️ optional | Email notifications |
| `EMAIL_FROM` | ⚠️ optional | `Tasty Time <no-reply@tastytime.ma>` |
| `VAPID_SUBJECT` | ⚠️ optional | `mailto:hello@tastytime.ma` |
| `VAPID_PUBLIC_KEY` | ⚠️ optional | Generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | ⚠️ optional | See above |
| `TWILIO_ACCOUNT_SID` | ⚠️ optional | SMS |
| `TWILIO_AUTH_TOKEN` | ⚠️ optional | SMS |
| `TWILIO_PHONE_NUMBER` | ⚠️ optional | SMS |
| `WHATSAPP_TOKEN` | ⚠️ optional | Meta Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | ⚠️ optional | Meta Cloud API |

## tastytime-web Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | `https://tastytime-api.vercel.app` |
| `NEXT_PUBLIC_TENANT_SLUG` | ✅ | `tastytime` |

## tastytime-dashboard Environment Variables

Same as web: `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_TENANT_SLUG`

## tastytime-driver Environment Variables

Same as web: `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_TENANT_SLUG`

---

## ⚠️ Socket.IO & BullMQ on Vercel

Vercel serverless functions do not support persistent connections (WebSockets) or long-running background workers.

- **Socket.IO** (real-time kitchen/driver updates) — requires a separate Node.js host (Railway, Render, Fly.io, or VPS). Use `apps/api` with `pnpm start` there.
- **BullMQ workers** (email/push/SMS/WhatsApp) — same: run `node dist/server.js` on a persistent host.

For a **fully serverless** setup, replace Socket.IO with [Pusher](https://pusher.com) or [Ably](https://ably.com), and BullMQ with [Inngest](https://inngest.com) or [Trigger.dev](https://trigger.dev).

---

## Recommended Database & Redis

- **Database**: [Neon](https://neon.tech) — serverless PostgreSQL, free tier available
- **Redis**: [Upstash](https://upstash.com) — serverless Redis, free tier available

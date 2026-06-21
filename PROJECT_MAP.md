# PROJECT_MAP — Tasty Time Restaurant SaaS

## TECH_STACK
- Monorepo: Turborepo 2.3 / pnpm 9.15
- Language: TypeScript 5.5
- Frontend: Next.js 15 (App Router), Tailwind CSS 4, Framer Motion 12, Zustand 5, TanStack Query 5, next-intl 4
- Backend: Hono 4 on Node.js 22
- Database: PostgreSQL 17, Drizzle ORM 0.41, schema-per-tenant multi-tenancy
- Cache/Queue: Redis 7, BullMQ 5
- Auth: Better Auth 1.x (JWT, Google OAuth)
- Real-time: Socket.IO 4
- Storage: Cloudflare R2 / AWS S3
- Email: Resend 4
- Push: web-push (VAPID)
- SMS: Twilio 5
- WhatsApp: Meta Cloud API v20
- i18n: next-intl 4 (fr ✅, en ✅, ar ✅ + RTL)
- Logging: Pino 9 (async, non-blocking)
- CI/CD: GitHub Actions
- Containerization: Docker Compose (PostgreSQL 17 + Redis 7)

## REAL MENU DATA (seeded)
Category: Tacos — Poulet 30dhs, Viande hachée 30dhs, Nuggets 30dhs, Tenders 30dhs, Mixte 35dhs (+10dhs gratiné cheddar)
Category: Poutines — Viande hachée 25dhs, Dinde fumée/Poulet 25dhs, Fingers 25dhs
Category: Sandwiches — Turkish 28dhs, Kebab 32dhs, American 34dhs, Mixte 36dhs (tous avec frites)
Category: Menu Enfants — Pizza/Burger/Nuggets + Frites + Boisson 32dhs
Category: Boissons — Soda 7dhs
Tenant: tastytime | Address: Avenue des Saveurs, Quartier Gourmand, Casablanca | Opening: 10/06/2026

## SYSTEM_FLOW
1. Customer → browse menu (/menu) → product card → customize modal → cart drawer → checkout → order confirmation → tracking page (real-time WebSocket)
2. Kitchen → receives new order via Socket.IO → accept/reject → update status (preparing → ready → out_for_delivery) → customer notified at each step
3. Driver PWA → toggle online → receives assignment → GPS tracking (30s interval) → mark delivered
4. Notifications → BullMQ queue → worker → Email (Resend) + Push (web-push VAPID) + WhatsApp (Meta API) + SMS (Twilio)
5. Reports → dashboard stats endpoint → live stats (daily revenue, peak hours, best sellers)

## ARCHITECTURE
```
tastytime/
├── apps/
│   ├── web/          (port 3000) Next.js 15 — customer storefront, menu, cart, checkout, order tracking
│   ├── dashboard/    (port 3001) Next.js 15 — staff KDS, order management, reports
│   ├── driver/       (port 3002) Next.js 15 PWA — driver app, GPS, delivery flow
│   └── api/          (port 4000) Hono + Socket.IO + BullMQ workers
├── packages/
│   ├── db/           Drizzle ORM, PostgreSQL schema-per-tenant, seed script
│   ├── types/        Shared TypeScript types (Order, Product, Driver, etc.)
│   ├── validators/   Shared Zod schemas (checkout, product, auth, etc.)
│   ├── ui/           Shared React components (Button, Badge, StatusBadge)
│   ├── i18n/         Translation files: fr.json ✅, en.json ✅, ar.json ✅ (RTL)
│   └── logger/       Pino async logger wrapper
├── docker/           docker-compose.yml (PostgreSQL 17 + Redis 7)
├── .github/workflows/ci.yml
└── .env.example
```

Multi-tenancy: PostgreSQL schema per tenant (public.tenants → tastytime.*)
Real-time rooms: order:{id} | kitchen:{tenantId} | dashboard:{tenantId} | driver:{driverId}

## MILESTONES COMPLETED
- [x] M0: Monorepo scaffolding, DB schema, seed (real Tasty Time menu), packages
- [x] M1/M2: Auth pages, cart promo + tip, auth-aware Navbar, dashboard pages (orders, menu, reports)
- [x] M3: Kitchen KDS hardened — 4-column Kanban, live elapsed timer, 15min overdue alert, Web Audio alert beep, thermal ticket print
- [x] M4: Driver PWA — Socket.IO order assignment, GPS tracking, proof-of-delivery photo capture, login page, PWA manifest

## ORPHANS & PENDING
### Phase 2 (Payments)
- [ ] CMI Morocco payment integration
- [ ] Stripe payment integration
- [ ] Apple Pay / Google Pay
### Future Features
- [ ] Apple Login (OAuth)
- [ ] Spanish language (es)
- [ ] Native mobile driver app (currently PWA)
- [ ] Inventory automatic stock deduction (product→ingredient mapping)
- [ ] Email marketing campaigns (Resend broadcasts)
- [ ] WhatsApp marketing broadcasts (Meta template approval required)
- [ ] SaaS billing / subscription management for multi-tenant
- [ ] Franchise admin panel (super-admin across tenants)
### Next Sprint
- [ ] M5: Notifications hardening (BullMQ retry, DLQ, push subscription endpoint)
- [ ] M6: Loyalty & Marketing UI (points widget, birthday gift trigger, referral)
- [ ] M7: Inventory & Reports (PDF export, stock alerts)
- [ ] M8: Staff Management UI (invite, RBAC, role switcher)
- [ ] M9: Multi-Tenant SaaS hardening (onboarding, subdomain, billing)
- [ ] M10: Production readiness (Playwright E2E, k6 load test, Dockerfile)

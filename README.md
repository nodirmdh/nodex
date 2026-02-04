# Nodex Delivery Platform

## What this project is
Nodex is a unified delivery platform with a single backend and single database supporting four interfaces:
- **Admin Panel (Web)**: Browser-based admin console.
- **Client App (Telegram Mini App)**: Customer ordering and tracking.
- **Courier App (Telegram Mini App)**: Courier workflow and profile.
- **Vendorka (Vendor Cabinet, Telegram Mini App)**: Vendor operations for a single physical point.

The platform supports food, retail, pharmacy, and market categories, with delivery and restricted pickup rules defined in the requirements.

## Interfaces
- **Admin WEB**: Vendor onboarding, promo codes, promotions, catalog governance, and operations oversight.
- **Client Mini App**: Browsing, ordering, promo codes, checkout, and live tracking.
- **Courier Mini App**: Accept → Picked Up → Delivered workflow with code verification and live tracking.
- **Vendorka Mini App**: Orders, menu CRUD, promotions, finance, statistics, and profile.
- **Shared Navigation Module**: In-app map with pickup/dropoff/courier markers used by client and courier miniapps.

## Quick start (placeholder)
### Monorepo setup
1. `npm install`

### API (Fastify)
1. Create `.env` (see `.env.example` for required keys)
2. `npm run dev:api`
2. API runs on `http://HOST:PORT` from `.env` (defaults: `0.0.0.0:3000`)

### Admin Web (React + Vite)
1. Set `VITE_API_URL` in `apps/admin-web/.env` (defaults to `http://localhost:3000`)
2. `npm run dev:admin`
2. Admin runs on `http://localhost:5173`

### Client Mini App (React + Vite)
1. Set `VITE_API_URL`, `VITE_DEV_MODE`, `VITE_DEV_CLIENT_ID`, `VITE_SUPPORT_TG_USERNAME` in `apps/client-miniapp/.env`
2. `npm run dev:client`
3. Client app runs on `http://localhost:5174`

### Courier Mini App (React + Vite)
1. Set `VITE_API_URL`, `VITE_DEV_MODE`, `VITE_DEV_COURIER_ID` in `apps/courier-miniapp/.env`
2. `npm run dev:courier`
3. Courier app runs on `http://localhost:5175`

### Vendor Web (React + Vite)
1. Set `VITE_API_URL`, `VITE_DEV_MODE` in `apps/vendor-web/.env`
2. `npm run dev:vendor`
3. Vendor web runs on `http://localhost:5176`

### Tests
1. `npm test`

### Database & Prisma
1. `docker compose up -d`
2. `npm -w apps/api exec prisma generate`
3. `npm -w apps/api exec prisma migrate dev`
4. `npm run seed`
5. Production-style migration: `npm -w apps/api exec prisma migrate deploy`

### DEV headers (local)
- Set `DEV_MODE=1` in `apps/api/.env`.
- Mini apps can send `x-dev-user: client|courier|vendor`.
- Vendor web also needs `x-vendor-id: <vendor_uuid>` to scope vendor data.

## Repository structure
- `docs/`: Product requirements, architecture, domains, plans, and status.
- `README.md`: High-level overview and contributor guidance.
- `AGENTS.md`: Operating rules for future agents and contributors.

## Contributing (docs-first)
1. Read `docs/requirements.md`, `docs/architecture.md`, `docs/domains.md`, and `docs/PLANS.md` before making changes.
2. Update documentation alongside any code changes.
3. Keep changes small and focused; prefer PR-sized increments.
4. Add or update tests for pricing and promotions logic.

## Core concept
Read `docs/PROJECT_OVERVIEW.md` — it defines the single-backend single-DB core and how all apps share the same Order lifecycle.

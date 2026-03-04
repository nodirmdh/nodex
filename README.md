# Nodex Restaurants MVP (Cloudflare, $0-first)

Nodex MVP for **Restaurants only**.

## Architecture
- Frontend: `apps/client-miniapp`, `apps/vendor-miniapp`, `apps/admin-web` (Vite + React + TS)
- Backend: `worker` (Cloudflare Workers + Hono)
- DB: Cloudflare D1 (SQLite)
- Auth:
  - Telegram Mini App `initData` verification on server
  - JWT HS256 sessions
  - RBAC: `client`, `vendor`, `admin`
- Bots:
  - client bot token (`CLIENT_BOT_TOKEN`)
  - vendor bot token (`VENDOR_BOT_TOKEN`)

## Repo layout
- `worker/` - Cloudflare Worker API
- `db/migrations/` - D1 migrations
- `apps/client-miniapp` - client Telegram mini app
- `apps/vendor-miniapp` - vendor Telegram mini app
- `apps/admin-web` - admin web app
- `packages/domain` - shared domain types

## API implemented
- `POST /auth/telegram` body: `{ initData, app: "client"|"vendor" }`
- `GET /restaurants`
- `GET /restaurants/:id/menu`
- `POST /orders` (client auth)
- `GET /orders/me` (client auth)
- `GET /vendor/orders/active` (vendor auth)
- `POST /vendor/orders/:id/status` (vendor auth)
- `POST /admin/restaurants` (admin auth)
- `PUT /admin/restaurants/:id` (admin auth)
- `POST /admin/menu-items` (admin auth)
- `PUT /admin/menu-items/:id` (admin auth)
- `GET /admin/orders` (admin auth)

## 1) Install deps
From repo root:

```bash
npm install
npm --prefix worker install
```

## 2) Create D1 database
Create DB once:

```bash
cd worker
npx wrangler d1 create nodex-db
```

Copy returned `database_id` into `worker/wrangler.toml` (`[[d1_databases]]`).

## 3) Apply migrations
You can apply migration SQL directly:

```bash
npx wrangler d1 execute <DB> --file ./db/migrations/0001_init.sql --config ./worker/wrangler.toml --local
```

Or use Wrangler migrations workflow:

```bash
cd worker
npx wrangler d1 migrations apply nodex-db --local
npx wrangler d1 migrations apply nodex-db --remote
```

Migrations are in `db/migrations/0001_init.sql`.

## 3.1) Seed data (2 restaurants + 10 menu items)
Recommended (script):

```bash
npm --prefix worker run seed -- <DB> --local
npm --prefix worker run seed -- <DB> --remote
```

Direct Node/TS entry (equivalent):

```bash
node worker/scripts/seed.ts <DB> --local
```

SQL alternative:

```bash
npx wrangler d1 execute <DB> --file ./worker/scripts/seed.sql --config ./worker/wrangler.toml --local
npx wrangler d1 execute <DB> --file ./worker/scripts/seed.sql --config ./worker/wrangler.toml --remote
```

## 4) Set Worker secrets

```bash
cd worker
npx wrangler secret put JWT_SECRET
npx wrangler secret put CLIENT_BOT_TOKEN
npx wrangler secret put VENDOR_BOT_TOKEN
npx wrangler secret put ADMIN_TG_IDS
```

Optional vars are already in `wrangler.toml`:
- `JWT_TTL_SECONDS` (default `604800`)
- `TELEGRAM_MAX_AUTH_AGE_SECONDS` (default `86400`)

## 5) Local dev

Terminal A - Worker API:

```bash
npm run dev:worker
```

Terminal B - client miniapp:

```bash
npm run dev:client
```

Terminal C - vendor miniapp:

```bash
npm run dev:vendor-miniapp
```

Terminal D - admin web:

```bash
npm run dev:admin
```

Set `VITE_API_URL` for each frontend app to local worker URL (default `http://127.0.0.1:8787`):
- `apps/client-miniapp/.env`
- `apps/vendor-miniapp/.env`
- `apps/admin-web/.env`

## 6) Deploy Worker

```bash
npm run deploy:worker
```

After deploy, your API URL will be like:

```text
https://nodex-worker.<account-subdomain>.workers.dev
```

## 7) Deploy each app to Cloudflare Pages
Create 3 separate Pages projects from this same Git repo.

### Client miniapp (Pages project 1)
- Root directory: repository root
- Build command:

```bash
npm ci && npm run build --workspace apps/client-miniapp
```

- Build output directory:

```text
apps/client-miniapp/dist
```

- Env var:

```text
VITE_API_URL=https://nodex-worker.<account-subdomain>.workers.dev
```

### Vendor miniapp (Pages project 2)
- Root directory: repository root
- Build command:

```bash
npm ci && npm run build --workspace apps/vendor-miniapp
```

- Build output directory:

```text
apps/vendor-miniapp/dist
```

- Env var:

```text
VITE_API_URL=https://nodex-worker.<account-subdomain>.workers.dev
```

### Admin web (Pages project 3)
- Root directory: repository root
- Build command:

```bash
npm ci && npm run build --workspace apps/admin-web
```

- Build output directory:

```text
apps/admin-web/dist
```

- Env var:

```text
VITE_API_URL=https://nodex-worker.<account-subdomain>.workers.dev
```

## Admin access note
`/auth/telegram` supports `client|vendor` apps. Admin endpoints require JWT with role `admin`.
Set `ADMIN_TG_IDS` secret as comma-separated Telegram IDs to auto-assign admin role during `/auth/telegram`.

Example value:
```text
123456789,987654321
```

## Admin usage
1. Открой admin-web URL (локально `http://localhost:5173` или Pages URL).
2. Вставь admin JWT на login-экране и нажми `Continue`.
3. Разделы слева:
   - `Overview`: KPI + последние заказы + map section
   - `Restaurants`: список ресторанов + create/update
   - `Orders`: список заказов
   - `Menu`: CRUD меню по выбранному ресторану
   - `Promos`, `Finance`, `Reviews`: рабочие admin-вью; промо/reviews в Worker v1 пока как placeholder-блоки
4. JWT сохраняется в `localStorage` (`nodex_admin_jwt`) и используется в admin API вызовах.

## Telegram auth verification
Worker validates Telegram `initData` signature using the app-specific bot token:
- `app="client"` -> `CLIENT_BOT_TOKEN`
- `app="vendor"` -> `VENDOR_BOT_TOKEN`

Verification includes:
- `hash` signature check (HMAC-SHA256, Telegram WebApp algorithm)
- `auth_date` max age check
- role override to `admin` when `tgId` is in `ADMIN_TG_IDS`

## Notes
- Cart rule (one restaurant per cart) is enforced in client miniapp UI.
- Miniapp JWT is in memory only.
- Admin JWT is stored in `localStorage`.

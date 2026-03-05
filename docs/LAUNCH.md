# Launch Checklist (Cloudflare Free, без платных сервисов)

Этот чеклист сделан для запуска MVP максимально просто.
MVP: только Restaurants, без courier-модуля (доставка силами vendor).
Статусы заказа: `NEW -> ACCEPTED -> COOKING -> ONWAY -> DELIVERED` (+ `CANCELLED`).

## 0) Установка инструментов
Проверь, что всё установлено:

```bash
node -v
npm -v
npx wrangler -v
```

Если `wrangler` не найден:

```bash
npm i -g wrangler
```

## 1) Логин в Cloudflare

```bash
npx wrangler login
```

Откроется браузер, подтверди доступ.

## 2) Создание D1 базы

```bash
npx wrangler d1 create nodex-db
```

После команды скопируй `database_id` и вставь в `worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "nodex-db"
database_id = "<вставь id сюда>"
```

## 3) Применить миграции

```bash
npx wrangler d1 execute nodex-db --file ./db/migrations/0001_init.sql --config ./worker/wrangler.toml --remote
```

## 4) Запустить seed

```bash
npm --prefix worker run seed -- nodex-db --remote
```

Альтернатива через SQL-файл:

```bash
npx wrangler d1 execute nodex-db --file ./worker/scripts/seed.sql --config ./worker/wrangler.toml --remote
```

## 5) Секреты Worker
Выполни по одной команде:

```bash
npx wrangler secret put CLIENT_BOT_TOKEN
npx wrangler secret put VENDOR_BOT_TOKEN
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_TG_IDS
```

Формат `ADMIN_TG_IDS`: `123,456` (через запятую, Telegram user id).

## 6) Локальный запуск

Worker (терминал 1):

```bash
npm run dev:worker
```

Фронты (каждый в отдельном терминале):

```bash
npm run dev:client
npm run dev:vendor
npm run dev:admin
```

Для быстрой проверки API:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\smoke-test.ps1
```

## 7) Деплой Worker

```bash
npm run deploy:worker
```

Скопируй итоговый URL вида:

```text
https://nodex-worker.<subdomain>.workers.dev
```

## 8) Деплой фронтов в Cloudflare Pages (через Git)
Создай **3 отдельных Pages проекта** из этого же репозитория:
- `client-miniapp`
- `vendor-miniapp`
- `admin-web`

Важно: `courier-miniapp` удален из MVP и не деплоится.

Для каждого проекта укажи:

### client-miniapp
- Build command:

```bash
npm ci && npm --prefix apps/client-miniapp run build
```

- Output directory:

```text
apps/client-miniapp/dist
```

- Env vars:

```text
VITE_API_BASE_URL=<worker_url>
VITE_API_URL=<worker_url>
```

### vendor-miniapp
- Build command:

```bash
npm ci && npm --prefix apps/vendor-miniapp run build
```

- Output directory:

```text
apps/vendor-miniapp/dist
```

- Env vars:

```text
VITE_API_BASE_URL=<worker_url>
VITE_API_URL=<worker_url>
```

### admin-web
- Build command:

```bash
npm ci && npm --prefix apps/admin-web run build
```

- Output directory:

```text
apps/admin-web/dist
```

- Env vars:

```text
VITE_API_BASE_URL=<worker_url>
VITE_API_URL=<worker_url>
```

## 9) BotFather: WebApp URL для каждого бота
Нужно 2 бота: client и vendor.

Для каждого бота в BotFather:
1. Открой `BotFather`.
2. Выбери бота.
3. Открой настройки Web App (через меню bot settings / menu button).
4. Укажи URL нужного фронта из Cloudflare Pages:
- client bot -> URL `client-miniapp`
- vendor bot -> URL `vendor-miniapp`
5. Сохрани.

Важно: URL должен быть HTTPS и публичный.

## Автоматизация (готовые скрипты)

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\setup-d1.ps1
```

Bash:

```bash
bash ./tools/setup-d1.sh
```

Оба скрипта:
- спрашивают имя D1 базы
- создают D1 (если уже есть, продолжают)
- применяют миграцию
- запускают seed
- выводят команды для secrets


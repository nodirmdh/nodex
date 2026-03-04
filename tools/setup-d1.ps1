param(
  [string]$DbName
)

$ErrorActionPreference = "Stop"

if (-not $DbName) {
  $DbName = Read-Host "Введите имя D1 базы (по умолчанию: nodex-db)"
  if (-not $DbName) {
    $DbName = "nodex-db"
  }
}

Write-Host "== Nodex D1 setup =="
Write-Host "DB: $DbName"

Write-Host "\n[1/4] Пытаюсь создать D1 базу..."
try {
  npx wrangler d1 create $DbName
} catch {
  Write-Host "Создание вернуло ошибку (возможно база уже существует). Продолжаем..."
}

Write-Host "\n[2/4] Применяю миграцию 0001_init.sql (remote)..."
npx wrangler d1 execute $DbName --file ./db/migrations/0001_init.sql --config ./worker/wrangler.toml --remote

Write-Host "\n[3/4] Запускаю seed..."
npm --prefix worker run seed -- $DbName --remote

Write-Host "\n[4/4] Готово. Теперь введи секреты Worker:"
Write-Host "npx wrangler secret put CLIENT_BOT_TOKEN"
Write-Host "npx wrangler secret put VENDOR_BOT_TOKEN"
Write-Host "npx wrangler secret put JWT_SECRET"
Write-Host "npx wrangler secret put ADMIN_TG_IDS"
Write-Host "Формат ADMIN_TG_IDS: 123,456"

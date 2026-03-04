#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-}"
if [[ -z "$DB_NAME" ]]; then
  read -rp "Введите имя D1 базы (по умолчанию: nodex-db): " DB_NAME
  DB_NAME="${DB_NAME:-nodex-db}"
fi

echo "== Nodex D1 setup =="
echo "DB: $DB_NAME"

echo
echo "[1/4] Пытаюсь создать D1 базу..."
if ! npx wrangler d1 create "$DB_NAME"; then
  echo "Создание вернуло ошибку (возможно база уже существует). Продолжаем..."
fi

echo
echo "[2/4] Применяю миграцию 0001_init.sql (remote)..."
npx wrangler d1 execute "$DB_NAME" --file ./db/migrations/0001_init.sql --config ./worker/wrangler.toml --remote

echo
echo "[3/4] Запускаю seed..."
npm --prefix worker run seed -- "$DB_NAME" --remote

echo
echo "[4/4] Готово. Теперь введи секреты Worker:"
echo "npx wrangler secret put CLIENT_BOT_TOKEN"
echo "npx wrangler secret put VENDOR_BOT_TOKEN"
echo "npx wrangler secret put JWT_SECRET"
echo "npx wrangler secret put ADMIN_TG_IDS"
echo "Формат ADMIN_TG_IDS: 123,456"

#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const dbName = process.argv[2] || process.env.D1_DB || "nodex-db";
const remoteFlag = process.argv.includes("--remote") || process.env.D1_REMOTE === "1";
const localFlag = process.argv.includes("--local") || !remoteFlag;

const vendor1Id = "seed-vendor-1";
const vendor2Id = "seed-vendor-2";

const statements = [
  "PRAGMA foreign_keys = ON;",
  "BEGIN TRANSACTION;",
  `INSERT OR IGNORE INTO users (id, tg_id, role, name, phone, created_at) VALUES ('${vendor1Id}', '900000001', 'vendor', 'Seed Vendor 1', '+998900000001', datetime('now'));`,
  `INSERT OR IGNORE INTO users (id, tg_id, role, name, phone, created_at) VALUES ('${vendor2Id}', '900000002', 'vendor', 'Seed Vendor 2', '+998900000002', datetime('now'));`,
  "INSERT OR REPLACE INTO restaurants (id, vendor_user_id, name, is_open, delivery_fee, min_order, eta_text) VALUES ('rest-seed-1', 'seed-vendor-1', 'Seed Burger House', 1, 5000, 25000, '25-35 min');",
  "INSERT OR REPLACE INTO restaurants (id, vendor_user_id, name, is_open, delivery_fee, min_order, eta_text) VALUES ('rest-seed-2', 'seed-vendor-2', 'Seed Pizza Point', 1, 6000, 30000, '30-40 min');",
  "INSERT OR REPLACE INTO menu_items (id, restaurant_id, title, price, is_available, category) VALUES ('menu-seed-1', 'rest-seed-1', 'Classic Burger', 28000, 1, 'BURGERS');",
  "INSERT OR REPLACE INTO menu_items (id, restaurant_id, title, price, is_available, category) VALUES ('menu-seed-2', 'rest-seed-1', 'Double Burger', 36000, 1, 'BURGERS');",
  "INSERT OR REPLACE INTO menu_items (id, restaurant_id, title, price, is_available, category) VALUES ('menu-seed-3', 'rest-seed-1', 'Fries', 12000, 1, 'SIDES');",
  "INSERT OR REPLACE INTO menu_items (id, restaurant_id, title, price, is_available, category) VALUES ('menu-seed-4', 'rest-seed-1', 'Chicken Nuggets', 18000, 1, 'SIDES');",
  "INSERT OR REPLACE INTO menu_items (id, restaurant_id, title, price, is_available, category) VALUES ('menu-seed-5', 'rest-seed-1', 'Cola', 9000, 1, 'DRINKS');",
  "INSERT OR REPLACE INTO menu_items (id, restaurant_id, title, price, is_available, category) VALUES ('menu-seed-6', 'rest-seed-2', 'Margherita', 42000, 1, 'PIZZA');",
  "INSERT OR REPLACE INTO menu_items (id, restaurant_id, title, price, is_available, category) VALUES ('menu-seed-7', 'rest-seed-2', 'Pepperoni', 48000, 1, 'PIZZA');",
  "INSERT OR REPLACE INTO menu_items (id, restaurant_id, title, price, is_available, category) VALUES ('menu-seed-8', 'rest-seed-2', 'Four Cheese', 52000, 1, 'PIZZA');",
  "INSERT OR REPLACE INTO menu_items (id, restaurant_id, title, price, is_available, category) VALUES ('menu-seed-9', 'rest-seed-2', 'Greek Salad', 22000, 1, 'SALADS');",
  "INSERT OR REPLACE INTO menu_items (id, restaurant_id, title, price, is_available, category) VALUES ('menu-seed-10', 'rest-seed-2', 'Orange Juice', 14000, 1, 'DRINKS');",
  "COMMIT;",
  "",
];

const sql = statements.join("\n");
const tmpDir = mkdtempSync(join(tmpdir(), "nodex-seed-"));
const seedFile = join(tmpDir, "seed.sql");
writeFileSync(seedFile, sql, "utf8");

const args = [
  "d1",
  "execute",
  dbName,
  "--file",
  seedFile,
  "--config",
  resolve("worker", "wrangler.toml"),
  localFlag ? "--local" : "--remote",
];

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(cmd, ["wrangler", ...args], {
  stdio: "inherit",
  cwd: resolve("."),
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Seed complete for DB: ${dbName} (${localFlag ? "local" : "remote"})`);

-- 0002_vendor_delivery.sql
PRAGMA foreign_keys = ON;

ALTER TABLE restaurants ADD COLUMN vendor_delivery INTEGER NOT NULL DEFAULT 1;
